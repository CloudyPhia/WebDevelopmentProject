import express, {Application, NextFunction, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";

import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private static insightFacade: IInsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
		Server.insightFacade = new InsightFacade();
	}


	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);

		// TODO: your other endpoints should go here

		this.express.put("/dataset/:id/:kind", Server.putDataset); // call addDataset somehow
		this.express.delete("/dataset/:id", Server.deleteDataset); // call removeDataset
		this.express.post("/query", Server.postQuery); // call performQuery
		this.express.get("/datasets", Server.getDataset); // call listDataset

		// this.express.get("/datasets", Server.insightFacade.listDatasets.bind(this));


	}

	private static putDataset(req: Request, res: Response, next: NextFunction) {
		console.log("we stan a woman in stem! trying to do putDataset in server...");
		try {
			let id = req.params.id;
			let kindString = req.params.kind;
			let kind: InsightDatasetKind;
			if (kindString === "Courses") {
				kind = InsightDatasetKind.Courses;
			} else {
				kind = InsightDatasetKind.Rooms;
			}
			let contentBuffer = req.body as Buffer;
			let content = contentBuffer.toString("base64");
			// let content = String.fromCharCode.apply(null, Array.from(new Uint16Array(contentBuffer)));
			console.log("We're doing the PUT call!");
			Server.insightFacade.addDataset(id, content, kind).then((result) => {
				res.status(200).json({result: result});
				console.log("PUT call sent!");
				return next();
			}).catch((e) => {
				console.log("400: We just caught the error " + e + " in putDataset");
				res.status(400).json({error: e.message});
				return next();
			});
		} catch (e) {
			if (e instanceof InsightError) {
				console.log("400: wtf happened - putDataset");
				res.status(400).json({error: e.message});
				return next();
			} else if (e instanceof Error) {
				console.log("400: wtf happened - putDataset");
				res.status(400).json({error: e.message});
				return next();
			}
		}
	}

	private static deleteDataset(req: Request, res: Response, next: NextFunction) {
		console.log("hey sexy ;) trying to do deleteDataset in server...");
		try {
			let id = req.params.id;
			Server.insightFacade.removeDataset(id).then((str) => {
				res.status(200).json({result: str});
				return next();
			}).catch((e) => {
				if (e instanceof InsightError) {
					console.log("400: wtf happened - deleteDataset");
					res.status(400).json({error: e.message});
					return next();
				} else if (e instanceof NotFoundError) {
					console.log("404: not found! - deleteDataset");
					res.status(404).json({error: e.message});
					return next();
				}
			});
		} catch (e) {
			if (e instanceof InsightError) {
				console.log("400: wtf happened - deleteDataset");
				res.status(400).json({error: e.message});
				return next();
			} else if (e instanceof NotFoundError) {
				console.log("404: not found! - deleteDataset");
				res.status(404).json({error: e.message});
				return next();
			}
		}
	}

	private static postQuery(req: Request, res: Response, next: NextFunction) {
		console.log("making a post? how iconic! attempting to do postQuery in server...");
		try {
			let query = req.body;
			console.log(query);
			Server.insightFacade.performQuery(query).then((data: InsightResult[]) => {
				res.status(200).json({result: data});
				return next();
			}).catch((e) => {
				console.log("400: wtf happened - postQuery catch");
				console.log(e);
				res.status(400).json({error: e.message});
				return next();
			});
		} catch (e) {
			if (e instanceof InsightError) {
				console.log("400: wtf happened - postQuery");
				res.status(400).json({error: e.message});
				return next();
			} else if (e instanceof Error) {
				console.log("400: wtf happened - postQuery");
				res.status(400).json({error: e.message});
				return next();
			}
		}
	}

	private static getDataset(req: Request, res: Response, next: NextFunction) {
		console.log("YES queen get that dataset! attempting to do getDataset in server...");
		Server.insightFacade.listDatasets().then((result) => {
			res.status(200).json({result: result});
			return next();
		});
		// there are no errors here, like no response codes
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
