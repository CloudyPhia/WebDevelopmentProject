export default class QueryNode {
	public value;
	public parent: any;
	public children: any[];

	constructor(value: any, parent: any) {
		this.value = value;
		this.parent = parent;
		this.children = [];
	}

	// public isFilterValid(filt: any): boolean {
	// 	if (!(filt instanceof Object)) {
	// 		console.log("Not a valid filter!");
	// 		return false;
	// 	}
	// 	let filterType = Object.keys(this)[0]; // UMMMM NOT SURE IF THIS IS RIGHT??
	//
	// 	// NOT DONE
	// 	return true;
	// }
	/*
	get isLeaf() {
		return this.children.length === 0;
	}

	get hasChildren() {
		return !this.isLeaf;
	}*/
}
