import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import QueryAST from "./QueryAST";
import QueryNode from "./QueryNode";
import {QuerySemantics} from "./QuerySemantics";

export default class Query {
	private idString: string = "";
	private columnsFields: string[];

	constructor() {
		this.columnsFields = [];
	}

	public isQueryValid(query: unknown): boolean {
		if (query === null || query === undefined) {
			return false;
		}
		if (!this.checkIfObjectWithFields(query)) {
			return false;
		}
		return true;
	}

	public checkIfObjectWithFields(query: any): boolean {
		if (typeof query === "object") {
			let queryKeys = Object.keys(query);
			if (queryKeys.length === 2) {
				return queryKeys[0] === "WHERE" && queryKeys[1] === "OPTIONS";
			} else {
				return (queryKeys[0] === "WHERE" && queryKeys[1] === "OPTIONS" && queryKeys.length === 3
					&& queryKeys[2] === "TRANSFORMATIONS");
			}
		}
		return false;
	}

	public storeQuery(query: any): QueryAST {
		let queryAST: QueryAST = new QueryAST(null);
		let rootNode: QueryNode = new QueryNode("root", null);
		queryAST.root = rootNode;
		this.recursiveStoreQuery(rootNode, query);
		queryAST.courseID = this.idString;
		return queryAST;
	}

	private recursiveStoreQuery(node: QueryNode, query: object) {
		let entriesList = Object.entries(query);
		for (let [key, value] of entriesList) {
			let testKey = parseInt(key, 10);
			let newKey;
			let newValue = value;
			if (!isNaN(testKey)) {
				newKey = Object.keys(value)[0];
				newValue = Object.values(value)[0];
			} else {
				newKey = key;
			}
			let keyNode: QueryNode = new QueryNode(newKey, node); // creates child node
			node.children.push(keyNode); // adds child to node's children array
			if (typeof newValue === "object" && newValue !== null) { // checks to make sure child is not leaf
				let returnquery = this.semanticCheckQuery(keyNode, newValue); // semantic check
				this.recursiveStoreQuery(keyNode, returnquery); // recursive call
			} else if (newValue !== null) {
				keyNode.children.push(newValue);
			}
		}
	}

	private semanticCheckQuery(queryNode: QueryNode, query: object): object {
		switch(queryNode.value) {
			case "OR": {
				// let this fall through
			}
			case "AND": {
				return this.isLogicValid(query);
			}
			case "IS": {
				return this.isIsValid(query);
			}
			case "LT": {
				// fall through
			}
			case "EQ": {
				// fall through
			}
			case "GT": {
				return this.isMComparatorValid(query);
			}
			case "NOT": {
				return this.isNOTValid(query);
			}
			case "COLUMNS": {
				return this.isColumnsValid(query);
			}
			case "WHERE": {
				return this.isWhereValid(query);
			}
			case "OPTIONS": {
				return this.isOptionsValid(query);
			}
			case "ORDER": {
				return this.isOrderValid(query);
			}
		}
		return new QuerySemantics(this).semanticCheck(queryNode, query);
	}

	private isOrderValid(query: object): object {
		let entries = Object.entries(query);
		if (entries.length === 1) {
			let [key, value] = entries[0];
			if (this.parseMKey(key) || this.parseSKey(key) || QuerySemantics.parseApplyKey(key)) {
				return query;
			}
			throw new InsightError("Order had single child of invalid type!");
		} else if (entries.length === 2) {
			if (!(entries[0][0] === "dir") && !(entries[1][0] === "keys")) {
				throw new InsightError("Order had multiple invalid children!");
			}
			if (entries[0][1] !== "UP" && entries[0][1] !== "DOWN") {
				throw new InsightError("Direction was not either up or down!");
			}
			for (let key of entries[1][1]) {
				if (!(this.parseMKey(key) || this.parseSKey(key) || QuerySemantics.parseApplyKey(key))) {
					throw new InsightError("Keys of Order were invalid!");
				}
			}
			return query;
		}
		throw new InsightError("Order had invalid number of children!");
	}

	private isWhereValid(query: object) {
		let whereKeys = Object.keys(query);
		if (whereKeys.length > 1 || whereKeys[0] === "COLUMNS") {
			throw new InsightError("Where was invalid!");
		}
		if (!(whereKeys.length === 0 || this.isTypeFilter(whereKeys[0]))) {
			throw new InsightError("Where was invalid!");
		}
		return query;
	}

	private isOptionsValid(query: object) {
		let optionsKeys = Object.entries(query);
		if (optionsKeys.length === 1 && optionsKeys[0][0] === "COLUMNS") {
			return query;
		} else if (optionsKeys.length === 1 || optionsKeys.length !== 2 || optionsKeys[1][0] !== "ORDER") {
			throw new InsightError("Incorrect field(s) in options!");
		}
		return query;
	}

	private isLogicValid(query: object) {
		// children can be of type AND, OR, LT, GT, EQ, IS, NOT
		let queryKeys = Object.entries(query);
		if (queryKeys.length < 1) {
			throw new InsightError("Logic had no children!");
		}
		let retObj: object = {};
		for (let [key, value] of queryKeys) {
			let keys = Object.keys(value);
			if (keys.length !== 1) {
				throw new InsightError("AND or OR had incorrect children format!");
			}
			let type = keys[0];
			if (typeof type !== "string") {
				throw new InsightError("Within isLogicValid, did not give it a string!");
			}
			if(!this.isTypeFilter(type)) {
				throw new InsightError("Logic was invalid!");
			}
		}
		return Object.values(query);
	}

	private isIsValid(query: object) {
		let queryKeys = Object.entries(query);
		if (queryKeys.length !== 1) {
			throw new InsightError("Is had invalid number of children!");
		}
		if (typeof queryKeys[0][1] !== "string") {
			throw new InsightError("Within Is, did not give it a valid string!");
		}
		if (!(this.parseSKey(queryKeys[0][0]) && this.parseInputString(queryKeys[0][1]))) {
			throw new InsightError("Is was invalid!");
		}
		return query;
	}


	private isMComparatorValid(query: object) {
		let comparatorKeys = Object.entries(query);
		if (comparatorKeys.length !== 1) {
			throw new InsightError("MComparator has invalid number of children!");
		}
		let cChild = comparatorKeys[0][0];
		if (this.isTypeFilter(cChild) || cChild === "COLUMNS" || cChild === "OPTIONS" || cChild === "WHERE") {
			throw new InsightError("MComparator child is of invalid type!");
		}
		if (!this.parseMKey(cChild) || isNaN(comparatorKeys[0][1])) {
			throw new InsightError("MComparator has invalid child!");
		}
		return query;
	}

	private isNOTValid(query: object) {
		let queryKeys = Object.keys(query);
		if (queryKeys.length !== 1 || !this.isTypeFilter(queryKeys[0])) {
			throw new InsightError("Not is invalid!");
		}
		return query;
	}

	private isColumnsValid(query: object) {
		let children = Object.entries(query);
		if (children.length < 0) {
			throw new InsightError("Columns is invalid!");
		}
		let retObj: object = {};
		for (let [key, value] of children) {
			if (!this.parseMKey(value) && !this.parseSKey(value) && !QuerySemantics.parseApplyKey(value)) {
				throw new InsightError("Columns child is invalid!");
			}
			Object.defineProperty(retObj, value, {value: null, enumerable: true});
		}
		return retObj;
	}

	private isTypeFilter(key: string) {
		return (key === "AND" || key === "OR" || key === "LT" || key === "GT" || key === "EQ" || key === "IS" ||
			key === "NOT");
	}

	public parseSKey(sKey: string): boolean {
		let sKeyFields = sKey.split("_", 2);
		let idString = sKeyFields[0];
		let sField = sKeyFields[1];
		return this.parseIDString(idString) && (sField === "dept" || sField === "id" || sField === "instructor" ||
			sField === "title" || sField === "uuid" || sField === "fullname" || sField === "shortname" ||
			sField === "number" || sField === "name" || sField === "address" || sField === "type" ||
			sField === "furniture" || sField === "href");
	}

	public parseMKey(mKey: string): boolean {
		let mKeyFields = mKey.split("_", 2);
		let idString = mKeyFields[0];
		let mField = mKeyFields[1];
		return this.parseIDString(idString) && (mField === "avg" || mField === "pass" || mField === "fail" ||
			mField === "audit" || mField === "year" || mField === "lat" || mField === "lon" || mField === "seats");
	}

	private parseInputString(inputString: string): boolean {
		return !(inputString === null || inputString === undefined) && this.checkAsterisk(inputString);
	}

	private checkAsterisk(inputString: string): boolean {
		if (!inputString.includes("*") || inputString.length < 3 ||
			(inputString.startsWith("*") && !inputString.slice(1).includes("*")) ||
			(inputString.endsWith("*") && !inputString.slice(0, -1).includes("*")) ||
			(inputString.startsWith("*") && inputString.endsWith("*") && !inputString.slice(1, -1).includes("*"))) {
			return true;
		}
		return false;
	}

	private parseIDString(idString: string): boolean {
		if (idString === null || idString === undefined || (typeof idString !== "string") ||
			idString.trim().length === 0 || idString === "" || idString.includes("_")) {
			return false;
		}
		if (this.idString === "") {
			this.idString = idString;
			return true;
		} else {
			return (this.idString === idString);
		}
	}
}
