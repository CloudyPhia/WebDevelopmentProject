import JSZip from "jszip";
import {InternalDataset} from "./InternalDataset";
import {InternalCourse} from "./InternalCourse";
import fs from "fs-extra";
import {InsightError} from "./IInsightFacade";

export class ProcessCourses {
	public static createTextObjForEachFileCourses(zip: JSZip, fileArray: any[]) {
		zip.folder("courses")?.forEach(function (filePath: string) {
			let fileObj = zip.file("courses/" + filePath)?.async("text");
			fileArray.push(fileObj);
		});
	}

	public static convertToJSON(listFiles: any[], jsonArray: any[], numRows: number, dataset: InternalDataset, id:
		string): number {
		for (let file of listFiles) {
			// check if JSON in file is valid
			try {
				let json = JSON.parse(file);
				// check if result is populated
				if (json["result"].length >= 1) {
					jsonArray.push(json);
				}
				for (let courseSection of json["result"]){
					try {
						let year: number;
						if (courseSection["Section"] === "overall") {
							year = 1900;
						} else {
							year = parseInt(courseSection["Year"], 10);
						}
						let dataObj = new InternalCourse(id, courseSection["Subject"], courseSection["Course"],
							courseSection["Avg"], courseSection["Professor"], courseSection["Title"],
							courseSection["Pass"], courseSection["Fail"], courseSection["Audit"],
							courseSection["id"], year);
						numRows += 1;
						dataset.listObjects.push(dataObj);
					} catch (e) {
						// hi
					}
				}
			} catch (e) {
				// do nothing, just skip to next file
			}
		}
		return numRows;
	}

	public static checkValidDirectoryCourses(zip: JSZip): boolean {
		let topDir = Object.keys(Object.values(zip)[0]);
		return (topDir[0] !== "courses/");
	}

	public static checkValidId(id: string): boolean {
		return id === null || id === undefined || (typeof id !== "string") || id.trim().length === 0 || id === "" ||
			id.includes("_");
	}

	public static writeData(writeString: string, id: string, PATH: string) {
		try {
			if (!fs.existsSync("./data")) {
				fs.mkdirSync("./data");
			}
			fs.writeFileSync(PATH + id, writeString);
		} catch (err) {
			throw new InsightError("Could not write file to disk.");
		}
	}
}
