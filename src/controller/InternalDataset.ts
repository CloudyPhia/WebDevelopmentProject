import {InternalObject} from "./InternalObject";
import {InsightDatasetKind} from "./IInsightFacade";

export class InternalDataset {
	public id: string;
	public kind: InsightDatasetKind;
	public listObjects: InternalObject[];

	constructor(id: string, kind: InsightDatasetKind) {
		this.listObjects = [];
		this.id = id;
		this.kind = kind;
	}
}
