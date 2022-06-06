import {InternalObject} from "./InternalObject";

export class InternalCourse implements InternalObject{
	public totalID: string;
	public dept: string;
	public id: string;
	public avg: number;
	public instructor: string;
	public title: string;
	public pass: number;
	public fail: number;
	public audit: number;
	public uuid: string;
	public year: number;

	constructor(id: string, dept: string, cid: string, avg: number, instructor: string, title: string, pass: number,
		fail: number, audit: number, uuid: string, year: number) {
		this.totalID = id;
		this.dept = dept;
		this.id = cid;
		this.avg = avg;
		this.instructor = instructor;
		this.title = title;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
		this.uuid = uuid;
		this.year = year;
	}

	public equals(c2: InternalCourse): boolean {
		return (this.totalID === c2.totalID) && (this.dept === c2.dept) && (this.id === c2.id)
			&& (this.avg === c2.avg) && (this.instructor === c2.instructor) && (this.title === c2.title)
			&& (this.pass === c2.pass) && (this.fail === c2.fail) && (this.audit === c2.audit)
			&& (this.uuid === c2.uuid) && (this.year === c2.year);
	}
}
