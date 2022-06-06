import QueryNode from "./QueryNode";
import {InsightDataset, InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import {InternalDataset} from "./InternalDataset";
import {InternalCourse} from "./InternalCourse";
import {InternalObject} from "./InternalObject";
import QueryTransformations from "./QueryTransformations";

export default class QueryAST {
	public root;
	public courseID: string = "";
	public resultData: any[] = [];
	public kind: string = "";

	constructor(key: null) {
		this.root = new QueryNode("", null);
	}

	public buildQueryResult(data: InternalDataset[]) {
		let courseList = this.buildQueryCourseList(data);
		let options = this.root.children[1];
		let columns = options.children[0];
		if (this.root.children.length === 3) {
			let transformations = this.root.children[2];
			QueryTransformations.checkValidityOfCols(columns, transformations);
			let fieldsAndValuesArr = QueryTransformations.visitTransformations(transformations, courseList, this.kind);
			let insightResult: InsightResult[] = QueryTransformations.buildResult(fieldsAndValuesArr, columns);
			if (options.children.length !== 1) {
				let order = options.children[1];
				insightResult = QueryTransformations.visitSort(order, insightResult);
			}
			return insightResult;
		} else {
			let insightResult: InsightResult[];
			if (options.children.length !== 1) {
				let order = options.children[1];
				if (order.children.length > 1) {
					insightResult = this.buildInsightResult(courseList, columns);
					insightResult = QueryTransformations.visitSort(order, insightResult);
				} else {
					courseList = QueryAST.sortCourses(courseList, order);
					insightResult = this.buildInsightResult(courseList, columns);
					if (!this.checkColumnsIncludesOrder(columns, order)) {
						throw new InsightError("Order was not included in Columns!");
					}
				}
			} else {
				insightResult = this.buildInsightResult(courseList, columns);
			}
			return insightResult;
		}
	}

	public buildQueryCourseList(data: InternalDataset[]) {
		let where = this.root.children[0];
		let correctDataset = null;
		for (let dataset of data) {
			if (dataset.id === this.courseID) {
				correctDataset = dataset;
				if (dataset.kind === InsightDatasetKind.Courses) {
					this.kind = "courses";
				} else {
					this.kind = "rooms";
				}
			}
		}
		if (correctDataset === null) {
			throw new InsightError("This query references a dataset not stored on disk!");
		}
		this.resultData = this.determineClassAndFilter(where.children[0], correctDataset.listObjects);
		return this.resultData; // STUB IDK WHAT WE'RE ACTUALLY RETURNING
	}

	private buildInsightResult(courseList: InternalCourse[], columns: QueryNode): InsightResult[] {
		let insightResult: InsightResult[] = [];
		let length = 0;
		for (let course of courseList) {
			let result: InsightResult = {};
			for (let field of columns.children) {
				let sortingField = this.getColumnsKeys(field)[1];
				let courseDescriptor = Object.getOwnPropertyDescriptor(course, sortingField);
				if (courseDescriptor !== undefined) {
					let objValue = courseDescriptor.value;
					if (sortingField === "uuid") {
						objValue = objValue.toString();
					} else if (sortingField === "year") {
						objValue = parseInt(objValue, 10);
					}
					Object.defineProperty(result, field.value, {value: objValue, enumerable: true});
				}
			}
			insightResult.push(result);
			length++;
			if (length > 5000) {
				throw new ResultTooLargeError("Result contained more than 5000 items!");
			}
		}
		return insightResult;
	}

	public static sortCourses(courseList: InternalObject[], order: QueryNode): any {
		let sortingField = order.children[0].split("_",2)[1];
		let sortedCourse = courseList.sort((c1,c2) => {
			let c1Descriptor = Object.getOwnPropertyDescriptor(c1, sortingField);
			let c2Descriptor = Object.getOwnPropertyDescriptor(c2, sortingField);
			if (c1Descriptor !== undefined && c2Descriptor !== undefined) {
				if (c1Descriptor.value > c2Descriptor.value) {
					return 1;
				} else if (c1Descriptor.value < c2Descriptor.value) {
					return -1;
				} else {
					return 0;
				}
			}
			throw new InsightError("Error in sorting courses!");
		});
		return sortedCourse;
	}

	private checkColumnsIncludesOrder(columns: any, order: any): boolean {
		let orderKeys: any[];
		if (order.children.length > 1) {
			orderKeys = order.children[1].children;
		} else {
			orderKeys = order.children;
		}
		let columnsList = columns.children;
		let newColumnsList = [];
		for (let node of columnsList) {
			newColumnsList.push(node.value);
		}
		for (let key of orderKeys) {
			if (!newColumnsList.includes(key)) {
				return false;
			}
		}
		return true;
	}

	private getColumnsKeys(node: any) {
		let mNode = node.value;
		return mNode.split("_", 2);
	}

	private determineClassAndFilter(node: any, data: InternalObject[]): any {
		let value = node.value;
		let temp: InsightDataset[] = [];
		switch(value) {
			case "AND": {
				return this.visitAnd(node, data);
			}
			case "OR": { return this.visitOr(node, data);
			}
			case "IS": {
				return this.visitIS(node, data);
			}
			case "LT": {
				return this.visitLT(node, data);
			}
			case "GT": {
				return this.visitGT(node, data);
			}
			case "EQ": {
				return this.visitEQ(node, data);
			}
			case "NOT": {
				return this.visitNOT(node, data);
			}
			default: {
				throw new InsightError("DetermineClass returned nothing! :((");
			}
		}
	}

	private visitAnd(node: any, data: InternalObject[]) {
		let temp: any[] = [];
		let andChildren = node.children;
		let i = 0;
		for (i; i < andChildren.length; i++) {
			let temp2 = this.determineClassAndFilter(andChildren[i], data);
			if (i === 0) {
				temp = temp2;
			} else {
				temp = temp.filter((a) => temp2.includes(a));
			}
		}
		let removedDuplicatesWithASet = new Set(temp);
		temp = Array.from(removedDuplicatesWithASet);
		return temp;
	}

	private visitOr(node: any, data: InternalObject[]) {
		let temp: any[] = [];
		let orChildren = node.children;
		let i = 0;
		for (i; i < orChildren.length; i++) {
			let temp2 = this.determineClassAndFilter(orChildren[i], data);
			if (i === 0) {
				temp = temp2;
			} else {
				temp = temp.concat(temp2);
			}
		}
		let removedDuplicatesWithASet = new Set(temp);
		temp = Array.from(removedDuplicatesWithASet);
		return temp;
	}

	private visitEQ(node: any, data: InternalObject[]) {
		let temp: any[] = [];
		let mfield = QueryAST.getMKey(node)[1]; // "avg" or "pass" for example of NODE
		QueryTransformations.checkKeyType(mfield, this.kind);
		for (let course of data) {
			let courseDescriptor = Object.getOwnPropertyDescriptor(course, mfield);
			if (courseDescriptor !== undefined && courseDescriptor.value === node.children[0].children[0]) {
				temp.push(course);
			}
		}
		return temp;
	}

	public static getMKey(node: any) {
		let mNode = node.children[0].value;
		return mNode.split("_", 2);
	}

	private visitGT(node: any, data: InternalObject[]) {
		let temp: any[] = [];
		let mfield = QueryAST.getMKey(node)[1]; // "avg" or "pass" for example of NODE
		QueryTransformations.checkKeyType(mfield, this.kind);
		for (let course of data) {
			let courseDescriptor = Object.getOwnPropertyDescriptor(course, mfield);
			let courseValue = node.children[0].children[0];
			if (mfield === "year") {
				courseValue = parseInt(courseValue, 10);
			}
			if (courseDescriptor !== undefined && courseDescriptor.value > courseValue) {
				temp.push(course);
			}
		}
		return temp;
	}

	private visitLT(node: any, data: InternalObject[]) {
		let temp: any[] = [];
		let mfield = QueryAST.getMKey(node)[1]; // "avg" or "pass" for example of NODE
		QueryTransformations.checkKeyType(mfield, this.kind);
		for (let course of data) {
			let courseDescriptor = Object.getOwnPropertyDescriptor(course, mfield);
			if (courseDescriptor !== undefined && courseDescriptor.value < node.children[0].children[0]) {
				temp.push(course);
			}
		}
		return temp;
	}

	private visitIS(node: any, data: InternalObject[]) {
		let temp: any[] = [];
		let mfield = QueryAST.getMKey(node)[1]; // "avg" or "pass" for example of NODE
		QueryTransformations.checkKeyType(mfield, this.kind);
		for (let course of data) {
			let courseDescriptor = Object.getOwnPropertyDescriptor(course, mfield);
			let inputString = node.children[0].children[0];

			if (courseDescriptor !== undefined && inputString.length > 0) {
				if (inputString.startsWith("*") && inputString.endsWith("*")) {
					if (inputString.length > 2) {
						let searchString = inputString.slice(1, -1);
						if (courseDescriptor.value.includes(searchString)) {
							temp.push(course);
						}
					} else {
						temp.push(course);
					}
				} else if (inputString.startsWith("*")) {
					if(courseDescriptor.value.endsWith(inputString.slice(1))) {
						temp.push(course);
					}
				} else if (inputString.endsWith("*")) {
					if (courseDescriptor.value.startsWith(inputString.slice(0, -1))) {
						temp.push(course);
					}
				} else {
					if (courseDescriptor.value.toString() === inputString) {
						temp.push(course);
					}
				}
			} else if (courseDescriptor !== undefined && courseDescriptor.value === "") {
				temp.push(course);
			}
		}
		return temp;
	}

	private visitNOT(node: any, data: InternalObject[]) {
		let allData: any[] = data;
		let notChildren = node.children;
		let temp = this.determineClassAndFilter(notChildren[0], data);
		return allData.filter((a) => !temp.includes(a));
	}
}
