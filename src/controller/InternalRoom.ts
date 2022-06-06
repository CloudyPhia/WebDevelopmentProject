import {InternalObject} from "./InternalObject";

export class InternalRoom implements InternalObject{
	public totalID: string = "";
	public fullname: string = "";
	public shortname: string = "";
	public number: string = "";
	public name: string = "";
	public address: string = "";
	public lat: number = 0;
	public lon: number = 0;
	public seats: number = 0;
	public type: string = "";
	public furniture: string = "";
	public href: string = "";

	public equals(c2: InternalRoom): boolean {
		return (this.totalID === c2.totalID) && (this.fullname === c2.fullname) && (this.shortname === c2.shortname)
			&& (this.number === c2.number) && (this.name === c2.name) && (this.address === c2.address)
			&& (this.lat === c2.lat) && (this.lon === c2.lon) && (this.seats === c2.seats)
			&& (this.type === c2.type) && (this.furniture === c2.furniture) && (this.href === c2.href);
	}
}
