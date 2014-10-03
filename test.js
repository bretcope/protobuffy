"use strict";

var ProtoBuffy = require('./lib/ProtoBuffy');

function Test ()
{
	// protobuf:1 int32
	this.a = 300;
	// protobuf:2 string
	this.b = 'hello';
	// protobuf:3 string optional
	this.c = 'world';
}

ProtoBuffy.setup(Test);

function run ()
{

	var start = process.hrtime();
	var it = 1000;
	for (var i = 0; i < it; i++)
	{
		var t = new Test();
		var b = t.encode();
	}
	
	var avg = diffToMs(process.hrtime(start)) / it;
	console.log(avg);
	console.log(1000 / avg);
	console.log(b.buffer.slice(0, b.position));
}

run();

function diffToMs (diff)
{
	return (diff[0] * 1000) + (diff[1] / 1e6);
}
