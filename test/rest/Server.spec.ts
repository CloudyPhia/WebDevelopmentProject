import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use,request} from "chai";
import chaiHttp from "chai-http";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {IInsightFacade, InsightDatasetKind, NotFoundError} from "../../src/controller/IInsightFacade";
import {Response} from "express";


let fs = require("fs-extra");


describe("Facade D3", function () {

	let facade: IInsightFacade;
	let server: Server;
	let URL = "http://localhost:4321";
	let courses: string;
	let InvDir: string;

	use(chaiHttp);
	use(request);

	before(function () {
		server = new Server(4321);
		courses = getContentFromArchives("courses.zip");
		InvDir = getContentFromArchives("InvDir.zip");
		// TODO: start server here once and handle errors properly
		try {
			server.start();
		} catch (err) {
			console.log("Encountered error: " + err);
		}
		console.log("Server has started, vroom vroom!");
	});

	after(function () {
		// TODO: stop server here once!
		try {
			server.stop();
		} catch (err) {
			console.log("Encountered error: " + err);
		}
		console.log("The sever has stopped!");
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what"s going on
		console.log("Before each of the functions");
		clearDisk();
		facade = new InsightFacade();
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what"s going on
		console.log("after each function! :D");
	});

	// Sample on how to format PUT requests

	it("PUT test for courses dataset", function () {
		let coursess = fs.readFileSync("./test/resources/archives/courses.zip");
		try {
			return request(URL)
				.put("/dataset/coursess/Courses")
				.send(coursess)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					console.log("hey girl... what are u up to 2nite? ;)");
					console.log("well.... I just got inside Then... Then is a lucky gal!");
					console.log("We're inside the then part of PUT test for courses dataset. Printing the body...");
					console.log(res.body.result);
					return expect(res).to.have.status(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log("Even though you failed, you're not a failure. Pick up and try again :)");
					return expect.fail("Failed, but shouldn't have. Should have added the dataset!");
				});
		} catch (err) {
			console.log(err + " was the error... why did that happen?");
			expect.fail(err + "<< that guy right there officer");
		}
	});

	it("FAIL!! PUT test for courses dataset NOT a kind in the put url!!", function () {
		let coursess = fs.readFileSync("./test/resources/archives/courses.zip");
		try {
			return request(URL)
				.put("/dataset/coursess/HelynIsAnIcon")
				.send(coursess)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					console.log("YAY IT WORKS IGNORE THIS > umm girl this should've failed??");
					return expect(res).to.have.status(400);
					// return expect.fail("should've failed in FAIL PUT TEST FOR COURSES DATASET NOT A KIND IN PUT URL");
				})
				.catch(function (err) {
					// some logging here please!
					console.log("We wanted it to fail and it did! yay! :)");
					console.log(err);
					return expect.fail("should've had res 400");
				});
		} catch (err) {
			console.log(err + " was the error... why did that happen?");
			expect.fail(err + "<< that guy right there officer");
		}
	});


	it("GET that list of datasets sis!", function () {
		try {
			return request(URL)
				.get("/datasets")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					console.log("GIRLLL u GOT!! THAT BAG!! aka dataset ;)");
					return expect(res).to.have.status(200);
				})
				.catch(function (err: Response) {
					// some logging here please!
					console.log("You couldn't secure that bag, sis :(");
					return expect.fail("Failed, but shouldn't have. Should have got the datasets!");
				});
		} catch (err) {
			console.log(err + " was the error... why did that happen?");
			expect.fail(err + "<< that guy right there officer");
		}
	});

	it("POST: post that SIMPLE query just like u post to instagram!!", function () {
		return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
			let queryToPost = {
				WHERE: {
					GT: {
						courses_avg: 97
					}
				},
				OPTIONS: {
					COLUMNS: [
						"courses_dept",
						"courses_avg"
					],
					ORDER: "courses_avg"
				}
			};
			return request(URL)
				.post("/query")
				.send(queryToPost)
				.set("Content-Type", "application/json")
				.then(function (res: ChaiHttp.Response) {
					console.log("Wooho the post simple query worked!");
					console.log(res.status);
					return expect(res).to.have.status(200);

				})
				.catch(function (err) {
					console.log("The simple post didn't go through :(");
					return expect.fail("Failed, but shouldn't have. Should have posted the query!");
				});
		}).catch((err) => expect.fail(err + "<< that guy right there officer"));
	});

	it("POST: post that COMPLEX query just like u post to instagram!!", function () {

		let queryToPostComplex = {
			WHERE: {
				OR: [
					{
						AND: [
							{
								GT: {
									courses_avg: 90
								}
							},
							{
								IS: {
									courses_dept: "adhe"
								}
							}
						]
					},
					{
						EQ: {
							courses_avg: 95
						}
					}
				]
			},
			OPTIONS: {
				COLUMNS: [
					"courses_dept",
					"courses_id",
					"courses_avg"
				],
				ORDER: "courses_avg"
			}
		};
		return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {

			return request(URL)
				.post("/query")
				.send(queryToPostComplex)
				.set("Content-Type", "application/json")
				.then(function (res: ChaiHttp.Response) {
					console.log("Wooho the post complex query worked!");
					console.log(res.status);
					return expect(res).to.have.status(200);
				})
				.catch(function (err) {
					console.log("The complex post didn't go through :(");
					return expect.fail("Failed, but shouldn't have. Should have posted the query!");
				});
		}).catch((err) => expect.fail(err + "<< that guy right there officer"));
	});

	it("POST: FAIL POST QUERY!! because it has too many results", function () {

		let queryToPost = {
			WHERE: {
				GT: {
					courses_avg: 0
				}
			},
			OPTIONS: {
				COLUMNS: [
					"courses_dept",
					"courses_avg"
				],
				ORDER: "courses_avg"
			}
		};

		return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {

			return request(URL)
				.post("/query")
				.send(queryToPost)
				.set("Content-Type", "application/json")
				.then(function (res: ChaiHttp.Response) {
					return expect(res).to.have.status(400);
					// return expect.fail("um.... this should have failed! you cant post that (it has too many results!");
				})
				.catch(function (err) {
					console.log("It failed! Yay!");
					// return expect(err.response).to.have.status(400);
					return expect.fail("um....this should have had res 400");
				});

		}).catch((err) => expect.fail(err + "<< that guy right there officer"));
	});

	it("POST: FAIL POST QUERY!! because there is no where", function () {
		return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {

			let queryToPost = {
				OPTIONS: {
					COLUMNS: [
						"courses_dept",
						"courses_avg"
					],
					ORDER: "courses_avg"
				}
			};
			return request(URL)
				.post("/query")
				.send(queryToPost)
				.set("Content-Type", "application/json")
				.then(function (res: ChaiHttp.Response) {
					return expect(res).to.have.status(400);
					// return expect.fail("um.... this should have failed! you cant post that with no where!");
				})
				.catch(function (err) {
					console.log("It failed! Yay!");
					// return expect(err.response).to.have.status(400);
					return expect.fail("um.... this should have failed! you cant post that with no where!");
				});
		}).catch((err) => expect.fail(err + "<< that guy right there officer"));
	});

	it("DELETE an existing dataset!", function () {
		return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {

			return request(URL)
				.del("/dataset/courses")
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					console.log("ok! u deleted the existing dataset!");
					return expect(res).to.have.status(200);
				})
				.catch(function (err) {
					console.log("You FAILED!!!! the delete an existing dataset!! >:(");
					return expect.fail("Failed, but shouldn't have. Should have deleted the dataset!");
				});
		}).catch((err) => expect.fail(err + "<< that guy right there officer"));
	});

	it("FAIL TO DELETE an existing dataset! NOT FOUND!!", function () {
		return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
			return request(URL)
				.del("/dataset/yourMother")
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					return expect(res).to.have.status(404);
					// return expect.fail("That dataset literally does not exist... this should've failed!");
				})
				.catch(function (err: ChaiHttp.Response) {
					console.log("good job on not deleting a nonexistent dataset!");
					return expect.fail("That dataset literally does not exist... this should've failed!");
					// return expect(err).to.have.status(404);
				});
		}).catch((err) => expect.fail(err + "<< that guy right there officer"));
	});


	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
