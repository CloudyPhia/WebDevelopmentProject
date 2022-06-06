import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import {folderTest} from "@ubccpsc310/folder-test";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";

let fs = require("fs-extra");

use(chaiAsPromised);

type Input = unknown;
type Output = Promise<InsightResult[]>;
type Error = "InsightError" | "ResultTooLargeError";

describe("InsightFacade", function () {
	let courses: string;
	let performQueryCourses: string;
	let ubc: string;
	let InvDir: string;
	let noCourses: string;
	let onecourse: string;
	let hex: string;
	let rooms: string;

	before(function () {
		courses = getContentFromArchives("only20courses.zip");
		performQueryCourses = getContentFromArchives("courses.zip");
		ubc = getContentFromArchives("ubc20courses.zip");
		InvDir = getContentFromArchives("InvDir.zip");
		noCourses = getContentFromArchives("noCourses.zip");
		onecourse = getContentFromArchives("onecourse.zip");
		rooms = getContentFromArchives("rooms.zip");
		hex = fs.readFileSync("test/resources/archives/only20courses.zip").toString("utf8");
	});

	describe("PersistentData", function() {
		let facade: IInsightFacade;

		before(function() {
			clearDisk();
		});

		beforeEach(function() {
			facade = new InsightFacade();
		});

		it("should add a Dataset, initialize a new InsightFacade, and successfully repopulate", function() {
			return facade.addDataset("only20courses", courses, InsightDatasetKind.Courses).then(() => {
				facade = new InsightFacade();
				return facade.listDatasets();
			}).then((insightDataset) => {
				expect(insightDataset).to.deep.equal([{
					id: "only20courses",
					kind: InsightDatasetKind.Courses,
					numRows: 316,
				}]);
			});
		});
	});

	describe("Datasets", function() {
		let facade: IInsightFacade; // let vs var, var is available at top while let is not

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should successfully add a valid dataset with a zip file name other than courses", function () {
			return facade.addDataset("course", ubc, InsightDatasetKind.Courses).then((retDataset) => {
				expect(retDataset).to.deep.equal(["course"]);
				return facade.listDatasets();
			}).then((insightDataset) => {
				expect(insightDataset).to.deep.equal([{
					id: "course",
					kind: InsightDatasetKind.Courses,
					numRows: 242,
				}]);
			});
		});
		it("should fail to add an invalid dataset with no course sections", function () {
			const none = facade.addDataset("courses", noCourses, InsightDatasetKind.Courses);
			return expect(none).to.be.eventually.rejectedWith(InsightError);
		});
		it("should fail to add an invalid dataset without the directory courses", function () {
			const directory = facade.addDataset("courses", InvDir, InsightDatasetKind.Courses);
			return expect(directory).to.be.eventually.rejectedWith(InsightError);
		});
		it("should fail to add a valid dataset that wasn't encoded in base64", function () {
			const hexData = facade.addDataset("courses", hex, InsightDatasetKind.Courses);
			return expect(hexData).to.be.eventually.rejectedWith(InsightError);
		});

		it ("addDataset should successfully add a rooms dataset", function() {
			return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms).then((retDataset) => {
				expect(retDataset).to.deep.equal(["rooms"]);
				return facade.listDatasets();
			}).then((insightDataset) => {
				expect(insightDataset).to.deep.equal([{
					id: "rooms",
					kind: InsightDatasetKind.Rooms,
					numRows: 364,
				}]);
			});
		});
	});

	describe("List Datasets", function () {
		let facade: IInsightFacade; // let vs var, var is available at top while let is not

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list no datasets", function () {
			return facade.listDatasets().then((insightDatasets) => { // return makes sure async runs
				// expect(insightDatasets).to.deep.equal([]); //deep equal used for equality between object
				expect(insightDatasets).to.be.an.instanceof(Array);
				expect(insightDatasets).to.have.length(0);
			});
		});

		it("should list one dataset", function (){
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([{
						id: "courses",
						kind: InsightDatasetKind.Courses,
						numRows: 316,
					}]);
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(1);
				});
		});

		it("should list multiple datasets of different kinds", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("roomDataset", rooms, InsightDatasetKind.Rooms);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedDatasets: InsightDataset[] = [
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 316,
						},
						{
							id: "roomDataset",
							kind: InsightDatasetKind.Rooms,
							numRows: 364,
						}
					];
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.deep.members(expectedDatasets); // works because unique members
					expect(insightDatasets).to.have.length(2);
				});
		});

		it("should list multiple datasets", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", onecourse, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedDatasets: InsightDataset[] = [
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 316,
						},
						{
							id: "courses-2",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
						}
					];
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.deep.members(expectedDatasets); // works because unique members
					expect(insightDatasets).to.have.length(2);
				});
		});
	});

	describe ("Perform Query", function () {
		let facade: IInsightFacade; // let vs var, var is available at top while let is not

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			return facade.addDataset("courses", performQueryCourses, InsightDatasetKind.Courses).then(() => {
				return facade.addDataset("courses-2", onecourse, InsightDatasetKind.Courses);
			}).then(() => {
				return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			});
		});

		/* function assertResult(actual: any, expected: Awaited<Output>): void | PromiseLike<void> {
			expect(actual).to.deep.equal(expected);
		}*/

		// Assert actual error is of expected type
		function assertError(actual: any, expected: Error): void {
			if (expected === "InsightError") {
				expect(actual).to.be.an.instanceof(InsightError);
			} else {
				expect(actual).to.be.an.instanceof(ResultTooLargeError);
			}
		}

		function checkOutput(actual: any, expected: any) {
			expect(actual).to.have.deep.members(expected);
			expect(actual).to.have.length(expected.length);
		}

		folderTest<Input, Output, Error>(
			"Perform Query Tests",
			(input: Input): Output => facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnError: assertError,
				assertOnResult: checkOutput,
			}
		);
	});

	describe ("Add Datasets", function () {
		let facade: IInsightFacade; // let vs var, var is available at top while let is not

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should successfully add one dataset", function () {
			return facade.addDataset("course", courses, InsightDatasetKind.Courses).then((retDataset) => {
				expect(retDataset).to.deep.equal(["course"]);
				return facade.listDatasets();
			}).then((insightDataset) => {
				expect(insightDataset).to.deep.equal([{
					id: "course",
					kind: InsightDatasetKind.Courses,
					numRows: 316,
				}]);
			});
		});
		it("should successfully add multiple datasets", function () {
			return facade.addDataset("course", courses, InsightDatasetKind.Courses).then(() => {
				return facade.addDataset("course-2", onecourse, InsightDatasetKind.Courses).then((retDataset) => {
					const expectedIds: string[] = ["course", "course-2"];
					expect(retDataset).to.have.deep.members(expectedIds);
					return facade.listDatasets();
				}).then((insightDataset) => {
					const expectedList: InsightDataset[] = [
						{
							id: "course",
							kind: InsightDatasetKind.Courses,
							numRows: 316,
						},
						{
							id: "course-2",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
						}
					];
					expect(insightDataset).to.have.deep.members(expectedList);
					expect(insightDataset).to.have.length(2);
				});
			});
		});
		it("addDataset should return InsightError if the key contains an underscore", function () {
			const underscore = facade.addDataset("hi_TAs", courses, InsightDatasetKind.Courses);
			return expect(underscore).to.be.eventually.rejectedWith(InsightError);
		});
		it("addDataset should return InsightError if the key is all whitespace", function () {
			const whitespace = facade.addDataset("   ", courses, InsightDatasetKind.Courses);
			return expect(whitespace).to.be.eventually.rejectedWith(InsightError);
		});
		it("addDataset should return InsightError if a dataset with that id already exists", function () {
			return facade.addDataset("course", courses, InsightDatasetKind.Courses).then(() => {
				const secondDatasetAdd = facade.addDataset("course", courses, InsightDatasetKind.Courses);
				return expect(secondDatasetAdd).to.be.eventually.rejectedWith(InsightError);
			});
		});
	});

	describe ("Remove Datasets", function () {
		let facade: IInsightFacade; // let vs var, var is available at top while let is not

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should successfully delete a dataset", function () {
			return facade.addDataset("course", courses, InsightDatasetKind.Courses).then(() => {
				return facade.removeDataset("course").then((retDataset) => {
					expect(retDataset).to.deep.equal("course");
				});
			});
		});
		it("removeDataset should return InsightError if the key contains an underscore", function () {
			const underscore = facade.removeDataset("hi_TAs");
			return expect(underscore).to.be.eventually.rejectedWith(InsightError);
		});
		it("removeDataset should return InsightError if the key is all whitespace", function () {
			const whitespace = facade.removeDataset("   ");
			return expect(whitespace).to.be.eventually.rejectedWith(InsightError);
		});
		it("removeDataset should return a NotFoundError if no dataset with given id exists", function () {
			const noID = facade.removeDataset("courses");
			return expect(noID).to.be.eventually.rejectedWith(NotFoundError);
		});
	});
});
