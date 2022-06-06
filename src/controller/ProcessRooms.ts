import http from "http";
import {InsightError} from "./IInsightFacade";
import {InternalObject} from "./InternalObject";
import {InternalRoom} from "./InternalRoom";
import JSZip from "jszip";

export class ProcessRooms {
	public static fixURLAddress(address: string): string {
		return address.replace(/ /gi, "%20");
	}

	public static getLatAndLon(address: string) {
		return new Promise(((resolve, reject) => {
			let server = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team572/" + address;
			http.get(server, (resp: any) => {
				resp.setEncoding("utf8");
				let rawData = "";
				resp.on("data", (chunk: any) => {
					rawData += chunk;
				});
				resp.on("end", () => {
					try {
						let parsedData: any = JSON.parse(rawData);
						resolve(parsedData);
					} catch (e) {
						reject ();
					}
				});
			}).on("error", (e: any) => {
				reject(new InsightError("Error in lat and lon"));
			});
		}));
	}

	public static findName(buildObj: any): string {
		try {
			let retString: string = "";
			if (buildObj.nodeName === "span") {
				let attribute = buildObj.attrs;
				if (attribute.length === 1 && Object.keys(attribute[0]).includes("value")
					&& attribute[0].value === "field-content") {
					return buildObj.childNodes[0].value;
				}
			} else if (Object.keys(buildObj).includes("childNodes")) {
				let nodes = buildObj.childNodes;
				for (let node of nodes) {
					retString += this.findName(node);
				}
			}
			return retString;
		} catch (e) {
			throw new InsightError("Error in findName!");
		}
	}

	public static findRooms(tbodyNode: any, roomArray: any[], addArray: string[]) {
		try {
			for (let element of tbodyNode.childNodes) {
				if (element.nodeName !== undefined && element.nodeName === "tr") {
					let trArray = element.childNodes;
					for (let node of trArray) {
						if (node.nodeName !== undefined && node.nodeName === "td") {
							let att = node.attrs;
							if (att[0].value === "views-field views-field-field-building-address") {
								addArray.push(node.childNodes[0].value.trim());
							}
							if (att[0].value === "views-field views-field-field-building-code") {
								roomArray.push(node.childNodes[0].value.trim());
							}
						}
					}
				}
			}
		} catch (e) {
			throw new InsightError("Error in findRooms!");
		}
	}

	public static findRoomInfo(buildingObj: any, name: string, address: string, wholeName:
		string):  Promise<InternalRoom[]> {
		return new Promise((resolve, reject) => {
			try {
				let numberArray: string[] = [];
				let hrefArray: string[] = [];
				let seatArray: number[] = [];
				let furnitureArray: string[] = [];
				let typeArray: string[] = [];
				for (let input of buildingObj.childNodes) {
					if (input.nodeName === "tr") {
						let trArray = input.childNodes;
						for (let node of trArray) {
							if (node.nodeName === "td") {
								let attribute = node.attrs;
								if (attribute[0].value === "views-field views-field-field-room-number") {
									numberArray.push(node.childNodes[1].childNodes[0].value);
									hrefArray.push(node.childNodes[1].attrs[0].value);
								} else if (attribute[0].value === "views-field views-field-field-room-capacity") {
									seatArray.push(+node.childNodes[0].value.trim());
								} else if (attribute[0].value === "views-field views-field-field-room-furniture") {
									furnitureArray.push(node.childNodes[0].value.trim());
								} else if (attribute[0].value === "views-field views-field-field-room-type") {
									typeArray.push(node.childNodes[0].value.trim());
								}
							}
						}
					}
				}
				resolve(this.enterRoomValues(numberArray, wholeName, name, address, seatArray,
					typeArray, furnitureArray, hrefArray));
			} catch (e) {
				reject(new InsightError("Error in findRoomInfo!" + e));
			}
		});
	}

	public static enterRoomValues(numberArray: string[], wholeName: string, name: string, address: string, seatArray:
		number[], typeArray: string[], furnitureArray: string[], hrefArray: string[]): Promise<InternalRoom[]> {
		return new Promise((resolve, reject) => {
			try {
				let retArray: InternalRoom[] = [];
				let latLonList: any[] = [];
				for (let element in numberArray) {
					let rooms: InternalRoom = new InternalRoom();
					rooms.fullname = wholeName;
					rooms.shortname = name;
					rooms.number = numberArray[element];
					rooms.name = rooms.shortname + "_" + rooms.number;
					rooms.address = address;
					if (seatArray[element] === undefined) {
						rooms.seats = 0;
					} else {
						rooms.seats = seatArray[element];
					}
					rooms.type = typeArray[element];
					rooms.furniture = furnitureArray[element];
					rooms.href = hrefArray[element];
					if (address !== undefined) {
						let newAddress = ProcessRooms.fixURLAddress(address);
						latLonList.push(ProcessRooms.getLatAndLon(ProcessRooms.fixURLAddress(newAddress)));
						retArray.push(rooms);
					}
				}
				Promise.all(latLonList).then((locations) => {
					for (let index in retArray) {
						retArray[index].lat = locations[index].lat;
						retArray[index].lon = locations[index].lon;
					}
					resolve(retArray);
				}).catch(() => reject (new InsightError("Error in Lat and Lon")));
			} catch (e) {
				reject (new InsightError("Error in enterRoomValues! " + e));
			}
		});

	}

	public static checkValidDirectoryRooms(zip: JSZip): boolean {
		let topDir = Object.keys(Object.values(zip)[0]);
		return (!topDir.includes("rooms/") && !topDir.includes("index.html"));
	}

	public static createTextObjForEachFileRooms(zip: JSZip, fileArray: any[], names: any[]) {
		let path = "rooms/campus/discover/buildings-and-classrooms";
		zip.folder(path)?.forEach(function (filePath: string) {
			names.push(filePath);
			let fileObj = zip.file(path + "/" + filePath)?.async("string");
			fileArray.push(fileObj);
		});
	}

	public static repopulateRoomsDataset(roomsSection: any, totalID: any): InternalRoom {
		let dataObj = new InternalRoom();
		dataObj.totalID = totalID;
		dataObj.fullname = roomsSection["fullname"];
		dataObj.shortname = roomsSection["shortname"];
		dataObj.number = roomsSection["number"];
		dataObj.name = roomsSection["name"];
		dataObj.address = roomsSection["address"];
		dataObj.lat = roomsSection["lat"];
		dataObj.lon = roomsSection["lon"];
		dataObj.seats = roomsSection["seats"];
		dataObj.type = roomsSection["type"];
		dataObj.furniture = roomsSection["furniture"];
		dataObj.href = roomsSection["href"];
		return dataObj;
	}
}
