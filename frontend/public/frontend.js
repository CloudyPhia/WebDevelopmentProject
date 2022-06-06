document.getElementById("data-submit").addEventListener("click", handleDataSubmit)

function handleDataSubmit() {
	/* let reader = new FileReader();
	reader.onload = function() {
		let arrayBuffer = reader.result;
		console.log("Buffer loaded");
	};*/
	let textInput = document.forms["datasetForm"]["textBox"].value;
	let fileField = document.querySelector('input[type="file"]');
	try {
		let body = fileField.files[0];
		fetchPUTRequest(body,textInput);
	} catch (e) {
		console.log(e);
	}
}

function fetchPUTRequest(body, textInput) {
	try {
		console.log(body);
		let putURL = "http://localhost:4321/dataset/" + textInput + "/Courses";
		fetch(putURL, {
			method: 'PUT',
			body: body,
		})
			.then(response => {
				if (response.status === 200) {
					response.json()
						.then(result => {
						console.log('Success:', result);
						customErrorMessage("", "addDatasetError"); // clearing any old errors
						update();
					})
						.catch(error => {
							console.log("Error", error);
							// alert("Invalid response sent!");
							customErrorMessage("Invalid response sent!", "addDatasetError");
						});
				} else {
					console.log("Error", response);
					// alert("Invalid name or dataset submitted!");
					customErrorMessage("Invalid name or dataset submitted!", "addDatasetError");
				}
			});
	} catch (e) {
		console.log(e);
	}
}

document.getElementById("query-submit").addEventListener("click", handleQuerySubmit);

function handleQuerySubmit() {
	// let textInput = document.forms["query-form"]["query-text-box"].value;
	// let specialSelectorIn = document.querySelector("#query-editor-side-select");
	let filterSelectorIn = document.getElementById("query-editor-field-select")
		.options[document.getElementById("query-editor-field-select").selectedIndex].value;
	let textInput = document.getElementById("query-editor-text").value;

	if (visibleBool) {
		findListNodeAndUpdate(filterSelectorIn);
	} else {
		let newItem = {}
		console.log(textInput);
		Object.defineProperty(newItem, selectedDataset + "_" + filterSelectorIn, {
			value: textInput,
			enumerable: true
		});

		findListNodeAndUpdate(newItem);

	}


}

function findListNodeAndUpdate(newItem) {
	let query = document.getElementById("query");
	innerFind(query);
	function innerFind(obj) {
		let children = obj.children
		if (children !== undefined) {
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				if (!(child.tagName.toLowerCase() === "span") && !(child.tagName.toLowerCase() === "ul")) {
					if (child.id === nodeID) {
						let innerList = document.createElement("ul");
						let li = document.createElement("li");
						let span = document.createElement("span");
						if (visibleBool && !(selectType === "COLUMNS" || selectType === "ORDER")) {
							span.addEventListener("click", queryClick);
						} else if (selectType === "COLUMNS" || selectType === "ORDER") {
							newItem = selectedDataset + "_" + newItem;
						} else {
							let newObj = Object.entries(newItem)[0];
							newItem = newObj[0] + ":" + newObj[1];
						}
						span.innerText = newItem.toString();
						li.setAttribute("id", newItem + index);
						index++;
						li.appendChild(span);
						innerList.appendChild(li);
						child.appendChild(innerList);
						// update JSON
						return;
					} else {
						if (child.children !== undefined) {
							innerFind(child);
						} else {
							return;
						}
					}
				} else if (child.tagName.toLowerCase() === "ul") {
					innerFind(child);
				}
			}
		}
	}
	buildNewJSON();
	update();
}

function buildNewJSON() {
	let query = document.getElementById("query");
	let tempJSON = {};
	let tempSEND = {};
	innerFind(query, tempJSON, tempSEND);
	function innerFind(obj, temp, send) {
		let children = obj.children
		if (children !== undefined) {
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				if (!(child.tagName.toLowerCase() === "span") && !(child.tagName.toLowerCase() === "ul")) {
						Object.defineProperty(temp, child.id.slice(0, -2), {
							value: {},
							enumerable: true
						});
						let sendState = child.id.slice(0, -2);
						let value = {};
						if (sendState.includes(":")) {
							let entries = sendState.split(":", 2);
							sendState = entries[0];
							if (isNaN(entries[1])) {
								value = entries[1];
							} else {
								value = parseInt(entries[1], 10);
							}
						} else if (sendState === "ORDER") {
							console.log("hi im order");
							value = "";
						} else if (sendState === "COLUMNS") {
							value = [];
						}

						if (sendState.includes("_") && value instanceof Object) {
							console.log(send);
							console.log(sendState);
							if (send instanceof Array) {
								send.push(sendState);
							} else if (sendState !== "") {
								console.log("this happens");
								sendJSON.OPTIONS.ORDER = sendState;
								order = sendState;
								console.log(sendJSON);
							}
							console.log(value);
							if (child.children !== undefined) {
								innerFind(child, temp[child.id.slice(0, -2)], send[sendState]);
							} else {
								return;
							}
						} else if (sendState === "AND" || (sendState === "OR")) {
							value = [{}];
							Object.defineProperty(send, sendState, {
								value: value,
								enumerable: true,
								writable: true
							});
							console.log(value);
							if (child.children !== undefined) {
								innerFind(child, temp[child.id.slice(0, -2)], send[sendState][0]);
							} else {
								return;
							}
						}
						else {
							Object.defineProperty(send, sendState, {
								value: value,
								enumerable: true,
								writable: true
							});
							console.log(value);
							if (child.children !== undefined) {
								innerFind(child, temp[child.id.slice(0, -2)], send[sendState]);
							} else {
								return;
							}
						}
				} else if (child.tagName.toLowerCase() === "ul") {
					innerFind(child, temp, send);
				}
			}
		}
	}
	console.log(sendJSON);
	jsonObj = tempJSON;
	sendJSON = tempSEND;
}

document.getElementById("perform-query").addEventListener("click", fetchPOSTRequest);

function fetchPOSTRequest() {
	try {
		console.log("body below")
		if (order !== "") {
			sendJSON.OPTIONS.ORDER = order;
		}
		console.log(sendJSON);
		let body = JSON.stringify(sendJSON);
		console.log(body);
		let postURL = "http://localhost:4321/query";
		fetch(postURL, {
			method: 'POST',
			body: body,
			headers: {
				"Content-Type": "application/json"
			}
		})
			.then(response => {
				if (response.status === 200) {
					response.json()
						.then(result => {
							console.log('Success:', result);
							makeTable(result["result"]);// a table is formed under the perform query button with all the results of the query
							generateList(jsonStart, document.getElementById("query"));
							buildNewJSON();
							customErrorMessage("", "performQueryTableError"); // clearing any old errors
						})
						.catch(error => {
							console.log("Error in fetch PostRequest:", error);
							// alert("Invalid response sent!");
							customErrorMessage("Invalid Response Sent!", "performQueryTableError");
						});
				} else {
					console.log("Error", response);
					// alert("PerformQuery failed!");
					customErrorMessage("PerformQuery failed!", "performQueryTableError");
				}
			});
	} catch (e) {
		console.log(e);
		customErrorMessage("Something went very wrong with PerformQuery. Please try again.",
			"performQueryTableError");
	}
}

function queryClick(e) {
	nodeID = e.target.parentElement.id;
	selectType = nodeID.replace(/[0-9]/g, "");
	let labelObj = document.getElementById("query-editor-select");
	labelObj.innerText = selectType;
	console.log(selectType);
	setSelectorOptions();
}

function setSelectorOptions() {
 	if (selectType === "IS") {
		visibleBool = false;
		showEditorOptions([...mfieldList,...sfieldList]);
 	} else if (selectType === "LT" || selectType === "GT" || selectType === "EQ") {
		visibleBool = false;
		showEditorOptions(mfieldList);
	} else if (selectType === "AND" || selectType === "OR" || selectType === "NOT" || selectType === "WHERE") {
		visibleBool = true;
		showEditorOptions(filterList);
	} else if (selectType === "OPTIONS") {
		 visibleBool = true;
		 showEditorOptions(["ORDER"]);
	} else if (selectType === "COLUMNS" || selectType === "ORDER") {
		visibleBool = true;
		showEditorOptions([...mfieldList,...sfieldList]);
	} else {
		 selectType = "SELECT";
	}
}

function buildSelectorOption(array, element) {
	removeOptions(element);
	let index = 0;
	for (let item of array) {
		element.options[index] = new Option(item, item);
		index++;
	}
}

function showEditorOptions(array) {
	let textIn = document.getElementById("query-editor-text");
	let selectIn = document.getElementById("query-editor-field-select");
	buildSelectorOption(array, selectIn)
	if (visibleBool) {
		textIn.style.visibility = "hidden";
	} else {
		textIn.style.visibility = "visible";
	}
}

function removeOptions(selectElement) {
	let i, L = selectElement.options.length - 1;
	for(i = L; i >= 0; i--) {
		selectElement.remove(i);
	}
}

function generateList(data, element) {
	index = 10;
	element.innerHTML = "";
	// create an inner item
	function createInner(obj, name, target) {
		let li = document.createElement("li");
		let span = document.createElement("span");
		span.innerText = name;
		li.setAttribute("id", name + index);
		span.addEventListener("click", queryClick);
		index++;
		li.appendChild(span);
		let objEntries = Object.entries(obj);
		if (objEntries !== undefined && objEntries.length > 0) {
			let innerList = document.createElement("ul");
			for (let [name, object] of objEntries) {
				createInner(object, name, innerList);
			}
			li.appendChild(innerList);
		}
		target.appendChild(li);
	}
	for (let name in data) {
		createInner(data[name], name, element);
	}
}

let nameList = [];
let selectedDataset = "";
let selectType = "filter";
let visibleBool = true;
let nodeID = "";
let index = 10;

let filterList = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
let mfieldList = ["avg", "pass", "fail", "audit", "year"];
let sfieldList = ["dept", "id", "instructor", "title", "uuid"];

let jsonObj = {
	WHERE: {
	},
	OPTIONS: {
		COLUMNS: [
		],
	}
};

let jsonStart = {
	WHERE: {
	},
	OPTIONS: {
		COLUMNS: [
		],
	}
}

let order = "";

let sendJSON = {};


window.onload = function() {
	update();
}

window.onchange = function() {
	update();
}

function update() {
	fetch("http://localhost:4321/datasets", {method: 'GET'}).then(response => response.json())
		.then(result => {
			let listCourses = result["result"];
			if (nameList.length !== Object.keys(listCourses).length) {
				let table = document.getElementById("list-dataset-table");
				let tbody = document.createElement("tbody");
				table.appendChild(tbody);
				listCourses.forEach(function (course) {
					if (!nameList.includes(course["id"])) {
						let row = document.createElement("tr");
						let cell = document.createElement("td");
						cell.textContent = course["id"];
						nameList.push(course["id"]);
						row.appendChild(cell);
						tbody.appendChild(row);
					}
				})
				updateDatasetDropdown();
				setSelectorOptions();
			}
			//makeTable(this.result);
			generateList(jsonObj, document.getElementById("query"));
			selectedDataset = document.getElementById("dataset-names").value;
		});
}

function updateDatasetDropdown () {
	let subjectSel = document.getElementById("dataset-names");
	let index = 0;
	for (let id of nameList) {
		subjectSel.options[index] = new Option(id, id);
		index++;
	}
}

function makeTable (result) {
	// figure out what's displayed in columns?
	// iterate through data
	// use like a for loop to go through each thing
	// produce table

	console.log("hi");
	console.log(result);
	console.log(result.length);

	let queryTable = document.getElementById("perform-query-table");

	if (result.length > 0) {
		let thead = queryTable.createTHead();
		queryTable.appendChild(thead);
		let firstObj = result[0];
		let headingsList = createHeadingsList(firstObj);
		let row = thead.insertRow(0);
		for (let i = 0; i < headingsList.length; i++) {
			let cell = row.insertCell(0);
			cell.innerHTML = headingsList[i];
			console.log(cell);
		}

		let tbody = document.createElement("tbody");
		queryTable.appendChild(tbody);
		for (let obj of result) {
			let values = makeValuesList(obj);
			let row = document.createElement("tr");
			for (let value of values) {
				let cell = document.createElement("td");
				cell.textContent = value;
				row.appendChild(cell);
			}
			tbody.appendChild(row);
		}
	}
}

function makeValuesList(obj) {
	let entries = Object.entries(obj);
	let retArray = [];
	for (let [key, value] of entries) {
		retArray.push(value);
	}
	return retArray;
}

function createHeadingsList(firstObj) {
	console.log(firstObj);
	let keys = Object.keys(firstObj);
	let retArray = [];
	console.log(keys);
	for (let key of keys) {
		let heading = key.split("_", 2)[1];
		retArray.push(heading.toUpperCase());
	}
	console.log(retArray);
	return retArray;
}


function customErrorMessage(message, id) {
	let errorPlace = document.getElementById(id);
	errorPlace.textContent = message;
	errorPlace.style.color = "red";
}
