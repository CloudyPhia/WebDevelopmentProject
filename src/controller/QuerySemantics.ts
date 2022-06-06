import QueryNode from "./QueryNode";
import {InsightError} from "./IInsightFacade";
import Query from "./Query";

export class QuerySemantics {
	private queryObj: Query;

	constructor(queryObj: Query) {
		this.queryObj = queryObj;
	}

	public semanticCheck(queryNode: QueryNode, query: object): object {
		switch(queryNode.value) {
			case "TRANSFORMATIONS": {
				return QuerySemantics.isTransformationsValid(query);
			}
			case "GROUP": {
				return this.isGroupValid(query);
			}
			case "APPLY": {
				return this.isApplyValid(query);
			}
			case "dir": {
				return this.isDirValid(query);
			}
			case "keys": {
				return this.isKeysValid(query);
			}
			default:
				return this.checkApplyToken(query);
		}
	}

	private isDirValid(query: object): object {
		let values = Object.values(query);
		for (let value of values) {
			if (value !== "UP" && value !== "DOWN") {
				throw new InsightError("Dir had incorrect children!");
			}
		}
		return query;
	}

	private isKeysValid(query: object): object {
		let values = Object.values(query);
		let retObj = {};
		if (values.length < 1) {
			throw new InsightError("Order keys were empty!");
		}
		for (let value of values) {
			if (!this.queryObj.parseSKey(value) && !this.queryObj.parseMKey(value) &&
				!QuerySemantics.parseApplyKey(value)) {
				throw new InsightError("Keys had incorrect children!");
			}
			Object.defineProperty(retObj, value, {value: null, enumerable: true});
		}
		return retObj;
	}

	public checkApplyToken(query: object): object {
		let entries = Object.entries(query);
		for (let [key, value] of entries) {
			if (this.parseApplyToken(key) && (this.queryObj.parseSKey(value) || this.queryObj.parseMKey(value))) {
				if (entries.length === 1) {
					return query;
				} else {
					throw new InsightError("Apply had invalid number of children!");
				}
			} else if (this.queryObj.parseSKey(value) || this.queryObj.parseMKey(value) ||
				QuerySemantics.parseApplyKey(value)) {
				return query;
			} else {
				throw new InsightError("Apply child was invalid!");
			}
		}
		throw new InsightError("Switch item was empty!");
	}

	public parseApplyToken(string: string): boolean {
		return string === "MAX" || string === "MIN" || string === "AVG" || string === "COUNT" || string === "SUM";
	}

	public isGroupValid(query: object): object {
		let array = Object.values(query);
		if (array.length < 1) {
			throw new InsightError("Group had invalid number of children!");
		}
		let retObj = {};
		for (let item of array) {
			if (!this.queryObj.parseMKey(item) && !this.queryObj.parseSKey(item)) {
				throw new InsightError("Group had child of invalid type!");
			}
			Object.defineProperty(retObj, item, {value: null, enumerable: true});
		}
		return retObj;
	}

	public isApplyValid(query: object): object {
		let keys = Object.values(query);
		if (keys.length < 1) {
			throw new InsightError("Apply has invalid number of children!");
		}
		let pastList: string[] = [];
		for (let key of keys) {
			if (pastList.includes(Object.keys(key)[0])) {
				throw new InsightError("Apply cannot have overlapping keys!");
			}
			if (!QuerySemantics.parseApplyKey(Object.keys(key)[0])) {
				throw new InsightError("Apply had child of incorrect type!");
			}
			pastList.push(Object.keys(key)[0]);
		}
		return query;
	}

	public static isTransformationsValid(query: object): object {
		let keys = Object.keys(query);
		if (keys.length === 2 && keys[0] === "GROUP" && keys[1] === "APPLY") {
			return query;
		}
		throw new InsightError("Transformations was invalid!");
	}

	public static parseApplyKey (string: string): boolean {
		return !(string === null || string === undefined || (typeof string !== "string") ||
			string.trim().length === 0 || string === "" || string.includes("_"));
	}
}
