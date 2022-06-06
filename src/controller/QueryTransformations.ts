import Decimal from "decimal.js";
import QueryNode from "./QueryNode";
import {InsightDataset, InsightError, InsightResult} from "./IInsightFacade";
import {InternalObject} from "./InternalObject";

export default class QueryTransformations {
	private static determineAndDealWithApplyToken(applyToken: string, key: string, group: InternalObject[], kind:
		string): number {
		switch(applyToken) {
			case "MAX": {return this.visitMax(key, group, kind);}
			case "MIN": {return this.visitMin(key, group, kind);}
			case "AVG": {return this.visitAvg(key, group, kind);}
			case "SUM": {return this.visitSum(key, group, kind);}
			case "COUNT": {return this.visitCount(key, group, kind);}
		}
		throw new InsightError("Value was unexpected!");
	}

	public static visitTransformations(node: QueryNode, objectList: InternalObject[], kind: string): any[] {
		let groupKeys: QueryNode[] = node.children[0].children;
		let listKeysList: any[] = [];
		let listValuesList: any[] = [];
		let groupedResults: any[] = [];
		for (let object of objectList) {
			let keysList: any[] = [];
			let valuesList: any[] = [];
			for (let key of groupKeys) {
				let keyValue: string = key.value;
				let field = keyValue.split("_", 2)[1];
				let courseDescriptor = Object.getOwnPropertyDescriptor(object, field);
				if (courseDescriptor !== undefined) {
					keysList.push(keyValue);
					valuesList.push(courseDescriptor.value);
				}
			}
			let arrayContains = QueryTransformations.arrayContains(listValuesList, valuesList);
			if (arrayContains !== false) {
				let index = arrayContains;
				groupedResults[index].push(object);
			} else {
				let index = listValuesList.length;
				listKeysList.push(keysList);
				groupedResults.push([]);
				groupedResults[index].push(object);
				listValuesList.push(valuesList);
			}
		}
		let resultOfGroupingAndApplying: any[] = [];
		let applyNode = node.children[1].children;
		for (let i = 0; i < groupedResults.length; i++) {
			let group = groupedResults[i];
			let fieldsList = listKeysList[i];
			let valuesList = listValuesList[i];
			for (let appRule of applyNode) {
				let appToken: string = appRule.children[0].value;
				let key: string = appRule.children[0].children[0];
				let calculatedApply = this.determineAndDealWithApplyToken(appToken, key, group, kind);
				let applyName = appRule.value;
				fieldsList.push(applyName);
				valuesList.push(calculatedApply);
			}
			let retArray = [fieldsList, valuesList];
			resultOfGroupingAndApplying.push(retArray);
		}
		return resultOfGroupingAndApplying;
	}

	private static visitMax(key: string, group: InternalObject[], kind: string): number {
		let field = key.split("_", 2)[1]; // "avg" or "pass" for example of NODE
		if (!this.parseNumericalField(field)) {
			throw new InsightError("Max was not a numerical field!");
		}
		QueryTransformations.checkKeyType(field, kind);
		let firstDescriptor = Object.getOwnPropertyDescriptor(group[0], field);
		if (firstDescriptor !== undefined) {
			let maxValue: number = firstDescriptor.value;
			for (let object of group) {
				let courseDescriptor = Object.getOwnPropertyDescriptor(object, field);
				if (courseDescriptor !== undefined && courseDescriptor.value >= maxValue) {
					maxValue = courseDescriptor.value;
				}
			}
			return maxValue;
		}
		throw new InsightError("Max field did not exist in object!");
	}

	private static visitMin(key: string, group: InternalObject[], kind: string): number {
		let field = key.split("_", 2)[1]; // "avg" or "pass" for example of NODE
		if (!this.parseNumericalField(field)) {
			throw new InsightError("Min was not a numerical field!");
		}
		QueryTransformations.checkKeyType(field, kind);
		let firstDescriptor = Object.getOwnPropertyDescriptor(group[0], field);
		if (firstDescriptor !== undefined) {
			let minValue: number = firstDescriptor.value;
			for (let object of group) {
				let courseDescriptor = Object.getOwnPropertyDescriptor(object, field);
				if (courseDescriptor !== undefined && courseDescriptor.value <= minValue) {
					minValue = courseDescriptor.value;
				}
			}
			return minValue;
		}
		throw new InsightError("Min field did not exist in object!");
	}

	private static visitAvg(key: string, group: InternalObject[], kind: string): number {
		let field = key.split("_", 2)[1]; // "avg" or "pass" for example of NODE
		if (!this.parseNumericalField(field)) {
			throw new InsightError("Avg was not a numerical field!");
		}
		QueryTransformations.checkKeyType(field, kind);
		let total: Decimal = new Decimal(0);
		let numRows = 0;

		for (let object of group) {
			let courseDescriptor = Object.getOwnPropertyDescriptor(object, field);
			if (courseDescriptor !== undefined) {
				total = Decimal.add(total, courseDescriptor.value);
				numRows++;
			}
		}
		let avg = (total.toNumber() / numRows);
		let res = Number(avg.toFixed(2));
		return res;
	}

	private static visitSum(key: string, group: InternalObject[], kind: string): number {
		let field = key.split("_", 2)[1]; // "avg" or "pass" for example of NODE
		if (!this.parseNumericalField(field)) {
			throw new InsightError("Sum was not a numerical field!");
		}
		QueryTransformations.checkKeyType(field, kind);
		let sum: Decimal = new Decimal(0);
		for (let object of group) {
			let courseDescriptor = Object.getOwnPropertyDescriptor(object, field);
			if (courseDescriptor !== undefined) {
				sum = Decimal.add(sum, courseDescriptor.value);
			}
		}
		let res = Number(sum.toFixed(2));
		return res;
	}

	private static visitCount(key: string, group: InternalObject[], kind: string): number {
		let temp: any[] = [];
		let count = 0;
		let field = key.split("_", 2)[1];
		QueryTransformations.checkKeyType(field, kind);
		for (let part of group) {
			let courseDescriptor = Object.getOwnPropertyDescriptor(part, field);
			if (courseDescriptor !== undefined && !temp.includes(courseDescriptor.value)) {
				temp.push(courseDescriptor.value);
				count++;
			}
		}
		return count;
	}

	public static visitSort(node: QueryNode, results: InsightResult[]): any[] {
		if (node.children.length === 1) {
			let keysList: string[] = node.children;
			results = QueryTransformations.sortResults(results, keysList, 1);
		} else {
			let type: number;
			let keysList = Object.values(node.children[1].children);
			if (node.children[0].children[0] === "DOWN") {
				type = -1;
			} else {
				type = 1;
			}
			results = QueryTransformations.sortResults(results, keysList, type);
		}
		return results;
	}

	private static sortResults(group: InsightResult[], keys: any[], type: number): InsightResult[] {
		if (group.length === 1) {
			return group;
		}
		let sortedCourse = group.sort((c1,c2) => {
			return QueryTransformations.sortingReturnValue(c1, c2, type, keys);
		});
		return sortedCourse;
	}

	private static sortingReturnValue(c1: InsightResult, c2: InsightResult, type: number, keys: any[]): number {
		let sortingField = keys[0].value;
		if (sortingField === undefined) {
			sortingField = keys[0];
		}
		let c1Descriptor = Object.getOwnPropertyDescriptor(c1, sortingField);
		let c2Descriptor = Object.getOwnPropertyDescriptor(c2, sortingField);
		if (c1Descriptor !== undefined && c2Descriptor !== undefined) {
			if (c1Descriptor.value > c2Descriptor.value) {
				return 0 + type;
			} else if (c1Descriptor.value < c2Descriptor.value) {
				return 0 - type;
			} else {
				if (keys.length > 1) {
					return QueryTransformations.sortingReturnValue(c1, c2, type, keys.slice(1));
				} else {
					return 0;
				}
			}
		}
		throw new InsightError("Error in sorting courses!");
	}

	public static buildResult(fieldsAndValues: any[], columns: QueryNode): InsightResult[] {
		let insightList: InsightResult[] = [];
		let columnsList = Object.values(columns.children);
		let newColumnsList = [];
		for (let column of columnsList) {
			newColumnsList.push(column.value);
		}
		for (let group of fieldsAndValues) {
			let fieldsList = group[0];
			let valuesList = group[1];
			let insightObj = {};
			for (let i = 0; i < fieldsList.length; i++) {
				if (newColumnsList.includes(fieldsList[i])) {
					if (fieldsList[i].includes("uuid")) {
						valuesList[i] = "" + valuesList[i] + "";
					}
					Object.defineProperty(insightObj, fieldsList[i], {
						value: valuesList[i],
						writable: true,
						enumerable: true
					});
				}
			}
			insightList.push(insightObj);
		}
		return insightList;
	}

	public static parseNumericalField(field: string): boolean {
		return (field === "avg" || field === "pass" || field === "fail" ||
			field === "audit" || field === "year" || field === "lat" || field === "lon" || field === "seats");
	}

	private static arrayContains (largerList: any[], smallerList: any[]): any {
		for (let i = 0; i < largerList.length; i++) {
			let item = largerList[i];
			let retBool = true;
			for (let index = 0; index < item.length; index++) {
				retBool = retBool && (item[index] === smallerList[index]);
			}
			if (retBool) {
				return i;
			}
		}
		return false;
	}

	public static checkFieldValidity(field: string, kind: string) {
		if (kind === "courses") {
			return (field === "avg" || field === "pass" || field === "fail" || field === "audit" || field === "year"
			|| field === "dept" || field === "id" || field === "instructor" || field === "title" || field === "uuid");
		} else {
			return (field === "fullname" || field === "shortname" || field === "number" || field === "name" ||
				field === "address" || field === "lat" || field === "lon" || field === "seats" || field === "type" ||
				field === "furniture" || field === "href");
		}
	}

	public static checkKeyType(field: string, kind: string) {
		if (!QueryTransformations.checkFieldValidity(field, kind)) {
			throw new InsightError("Invalid type of key!");
		}
	}

	public static checkValidityOfCols(columns: QueryNode, transformations: QueryNode) {
		let checkList = [];
		let groupNode = transformations.children[0].children;
		let applyNode = transformations.children[1].children;
		for (let node of groupNode) {
			checkList.push(node.value);
		}
		for (let node of applyNode) {
			checkList.push(node.value);
		}
		for (let node of columns.children) {
			if (!checkList.includes(node.value)) {
				throw new InsightError("Member of group was not in cols/apply!");
			}
		}
	}
}
