import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import JSZip from "jszip";
import {InternalCourse} from "./InternalCourse";
import {InternalDataset} from "./InternalDataset";
import Query from "./Query";
import QueryAST from "./QueryAST";
import {InternalObject} from "./InternalObject";
import {ProcessCourses} from "./ProcessCourses";
import {ProcessRooms} from "./ProcessRooms";
import {InternalRoom} from "./InternalRoom";

let fs = require("fs-extra");
let http = require("http");
let parse5 = require("parse5");

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private PATH = "./data/";
	public listIds: string[];
	public listInsightDataset: InsightDataset[];
	public listInternalDataset: InternalDataset[];
	constructor() {
		this.listIds = [];
		this.listInternalDataset = [];
		this.listInsightDataset = [];
		this.repopulateDatasets();
		console.log("InsightFacadeImpl::init()");
	}

	private repopulateDatasets() {
		if (!fs.existsSync(this.PATH)) {
			return;
		}
		let folder = fs.readdirSync(this.PATH);
		let jsonArray = [];
		for (let dataset of folder) {
			let textObj = fs.readFileSync(this.PATH + dataset).toString();
			let json = JSON.parse(textObj);
			jsonArray.push(json);
		}
		for (let json of jsonArray) {
			let totalID: string = json["id"];
			let kind: InsightDatasetKind = json["kind"];
			let internalDataset = new InternalDataset(totalID, kind);
			let numRows = 0;
			if (kind === InsightDatasetKind.Courses) {
				for (let courseSection of json["listObjects"]) {
					let dataObj = new InternalCourse(totalID, courseSection["dept"], courseSection["id"],
						courseSection["avg"], courseSection["instructor"], courseSection["title"],
						courseSection["pass"], courseSection["fail"], courseSection["audit"],
						courseSection["uuid"], courseSection["year"]);
					internalDataset.listObjects.push(dataObj);
					numRows++;
				}
				this.listIds.push(totalID);
				this.listInternalDataset.push(internalDataset);
				let insightDataset = InsightFacade.createInsightObj(totalID, numRows, InsightDatasetKind.Courses);
				this.listInsightDataset.push(insightDataset);
			} else if (kind === InsightDatasetKind.Rooms) {
				for (let roomsSection of json["listObjects"]) {
					let dataObj = ProcessRooms.repopulateRoomsDataset(roomsSection, totalID);
					internalDataset.listObjects.push(dataObj);
					numRows++;
				}
				this.listIds.push(totalID);
				this.listInternalDataset.push(internalDataset);
				let insightDataset = InsightFacade.createInsightObj(totalID, numRows, InsightDatasetKind.Courses);
				this.listInsightDataset.push(insightDataset);
			} else {
				throw new InsightError("Did not give repopulatedatasets a kind of Courses or Rooms!");
			}
		}
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let data = new JSZip();
		return new Promise((resolve, reject) => {
			if (ProcessCourses.checkValidId(id) || this.checkIncludesId(id)) {
				return reject(new InsightError("ID was invalid or already in use"));
			}
			if (fs.existsSync(this.PATH + id + ".txt")) {
				return reject(new InsightError("Dataset with ID already exists in memory"));
			}
			data.loadAsync(content, {base64: true}).then((zip) => {
				if (kind === InsightDatasetKind.Courses) {
					this.storeCourses(zip, id).then((result) => {
						return resolve(result);
					}).catch((e) => reject(e));
				} else if (kind === InsightDatasetKind.Rooms) {
					this.storeRooms(zip, id).then((result) => {
						return resolve(result);
					}).catch((e) => reject(e));
				} else {
					return reject(new InsightError("Kind must be a course or room!"));
				}
			}).catch((e) => reject(new InsightError(e)));
		});
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise((resolve, reject) => {
			if (ProcessCourses.checkValidId(id)) {
				return reject(new InsightError("ID was invalid"));
			}
			if (!this.checkIncludesId(id)) {
				return reject(new NotFoundError("ID was not found"));
			}
			try {
				this.listIds.forEach((idElement, index) => {
					if (idElement === id) {
						this.listIds.splice(index, 1);
					}
				});
				let removeInsightObj = this.listInsightDataset.find((i) => i.id === id);
				this.listInsightDataset = this.listInsightDataset.filter((obj) => obj !== removeInsightObj);
				let removeInternalObj = this.listInternalDataset.find((i) => i.id === id);
				this.listInternalDataset = this.listInternalDataset.filter((obj) => obj !== removeInternalObj);
				fs.removeSync(this.PATH + id);
				return resolve(id);
			} catch (e) {
				return reject(new InsightError("Remove was unsuccessful"));
			}
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise<InsightResult[]>((resolve, reject) => {
			let queryFunctions: Query = new Query();
			if (!queryFunctions.isQueryValid(query)) {
				return reject(new InsightError("This Query is not valid!"));
			}
			try {
				let queryAST: QueryAST = queryFunctions.storeQuery(query);
				let resultArray: InsightResult[] = queryAST.buildQueryResult(this.listInternalDataset);
				return resolve(resultArray);
			} catch (e) {
				return reject(e);
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.listInsightDataset);
	}

	private storeRooms(zip: JSZip, id: string): Promise<string[]>  {
		return new Promise((resolve, reject) => {
			if (ProcessRooms.checkValidDirectoryRooms(zip)){
				return reject(new InsightError("Zip file did not contain valid rooms zip"));
			}
			let fileArray: any[] = [];
			let totalRoomsArray: InternalObject[] = [];
			zip.file("rooms/index.htm")?.async("string").then((result) => {
				resolve(this.processStoreRooms(result, zip, fileArray, totalRoomsArray, id));
			}).catch((e) => reject (new InsightError(e)));
		});
	}

	private processStoreRooms(result: string, zip: JSZip, fileArray: any[], totalRoomsArray:
		InternalObject[], id: string): Promise<string[]> {
		return new Promise((resolve, reject) => {
			let document = parse5.parse(result);
			let tbodyNode = this.findNodeInfo(document, "tbody");
			if (tbodyNode === false) {
				return reject (new InsightError("Index file did not contain tbody section!"));
			}
			let roomArray: any[] = [];
			let addressArray: string[] = [];
			ProcessRooms.findRooms(tbodyNode, roomArray, addressArray);
			let addObj: any = {};
			for (let room in roomArray) {
				addObj[roomArray[room]] = addressArray[room];
			}
			let names: string[] = [];
			ProcessRooms.createTextObjForEachFileRooms(zip, fileArray, names);
			Promise.all(fileArray).then((buildings: any[]) => {
				let roomsPromises: any[] = [];
				for (let item in buildings) {
					let buildObj: any = parse5.parse(buildings[item]);
					let wholeName: string = ProcessRooms.findName(buildObj);
					let newNode = this.findNodeInfo(buildObj, "tbody");
					if (newNode !== false) {
						roomsPromises.push(ProcessRooms.findRoomInfo(newNode, names[item],
							addObj[names[item]], wholeName));
					}
				}
				Promise.all(roomsPromises).then((rooms) => {
					for (let room of rooms) {
						totalRoomsArray = totalRoomsArray.concat(room);
					}
					if (totalRoomsArray.length > 0) {
						this.listIds.push(id);
						let dataset = new InternalDataset(id, InsightDatasetKind.Rooms);
						dataset.listObjects = totalRoomsArray;
						this.listInternalDataset.push(dataset);
						let insightObj = InsightFacade
							.createInsightObj(id, totalRoomsArray.length, InsightDatasetKind.Rooms);
						this.listInsightDataset.push(insightObj);
						let writeString = JSON.stringify(dataset);
						ProcessCourses.writeData(writeString, id, this.PATH);
						return resolve(this.listIds);
					} else {
						reject (new InsightError("No valid buildings in dataset!"));
					}
				});
			});
		});
	}

	private storeCourses(zip: JSZip, id: string): Promise<string[]> {
		return new Promise (((resolve, reject) => {
			// check that the top directory name is courses
			if(ProcessCourses.checkValidDirectoryCourses(zip)){
				return reject(new InsightError("Zip file did not contain courses folder"));
			}
			// push each file in courses
			let fileArray: any[] = [];
			ProcessCourses.createTextObjForEachFileCourses(zip, fileArray);
			// make sure all promises are resolved for each file
			Promise.all(fileArray).then((listFiles: any[]) => {
				if (listFiles.length === 0) {
					return reject (new InsightError("No files in courses folder"));
				}
				let jsonArray: any[] = [];
				let numRows = 0;
				let dataset = new InternalDataset(id, InsightDatasetKind.Courses);
				numRows = ProcessCourses.convertToJSON(listFiles, jsonArray, numRows, dataset, id);
				// check if at least one file was populated
				if (jsonArray.length < 1) {
					return reject(new InsightError("Dataset was empty"));
				}
				this.listInternalDataset.push(dataset);
				let insightObj = InsightFacade.createInsightObj(id, numRows, InsightDatasetKind.Courses);
				this.listInsightDataset.push(insightObj);
				this.listIds.push(id);
				let writeString = JSON.stringify(dataset);
				ProcessCourses.writeData(writeString, id, this.PATH);
				return resolve(this.listIds);
			}).catch((e) => {
				return reject (new InsightError(e));
			});
		}));
	}

	private findNodeInfo(document: any, element: string): any {
		if (document.nodeName !== undefined && document.nodeName === element) {
			return document;
		} else {
			if (document.childNodes !== undefined) {
				let children = document.childNodes;
				for (let child of children) {
					let newNode = this.findNodeInfo(child, element);
					if (newNode !== false) {
						return newNode;
					}
				}
			}
		}
		return false;
	}

	private checkIncludesId(id: string): boolean {
		return this.listIds.includes(id);
	}

	private static createInsightObj(id: string, numRows: number, kind: InsightDatasetKind): InsightDataset {
		let insightObj: InsightDataset;
		insightObj = {id: id, kind: kind, numRows: numRows};
		return insightObj;
	}
}
