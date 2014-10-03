"use strict";
/* -------------------------------------------------------------------
 * Require Statements << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

var AutoBuffer = require('./AutoBuffer');
var Long = require('long');
var ProtoMember = require('./ProtoMember');

/* =============================================================================
 * 
 * ProtoBuffy
 *  
 * ========================================================================== */

var MIN_INT32 = 1 << 31;

var _VARINT = 0;
var _64BIT = 1;
var _LEN_DELIMITED = 2;
var _32BIT = 5;

module.exports = ProtoBuffy;

function ProtoBuffy ()
{
}

/* -------------------------------------------------------------------
 * Static Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

ProtoBuffy.setup = function (Constructor)
{
	var source = Constructor.toString();
	var lines = source.split(/[\r\n]+/g);
	
	var commentRegex = /^\/\/\s*protobuf\s*:\s*(\d+)\s+([a-z0-9]+)(\s.*)?$/;
	var memberRegex = /^this\.([a-zA-Z_$][a-zA-Z0-9_$]*)/;
	
	var members = [];
	
	var line;
	var comment = null;
	var memberMatch = null;
	var member;
	for (var i = 0; i < lines.length; i++)
	{
		line = lines[i].trim();
		if (!line)
			continue;
		
		if (comment)
		{
			memberMatch = memberRegex.exec(line);
			if (memberMatch)
			{
				member = new ProtoMember(memberMatch[1], Number(comment[1]), comment[2]);
				if (comment[3])
				{
					if (comment[3].indexOf('optional') !== -1)
						member.required = false;
					
					if (comment[3].indexOf('array') !== -1)
						member.array = true;
					
					// todo: handle packed=false syntax
				}
				members.push(member);
				
				comment = null;
				continue;
			}
		}
		
		comment = commentRegex.exec(line);
	}
	
//	console.log(members);
	createPrototypeMethods(Constructor, members);
};

/* -------------------------------------------------------------------
 * Prototype Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

//

/* -------------------------------------------------------------------
 * Private Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

/**
 * @param Constructor {function}
 * @param members {ProtoMember[]}
 */
function createPrototypeMethods (Constructor, members)
{
	var mLen = members.length;

	/**
	 * @param [buf] {AutoBuffer}
	 * @return {AutoBuffer}
	 */
	Constructor.prototype.encode = function (buf)
	{
		if (!buf)
			buf = new AutoBuffer();
		
		for (var i = 0; i < mLen; i++)
		{
			encodeType(buf, members[i], this[members[i].name]);
		}
		
		return buf;
	};
}

/**
 * @param buf {AutoBuffer}
 * @param member {ProtoMember}
 * @param val {number|string|boolean}
 */
function encodeType (buf, member, val)
{
	if (val === null)
		return;
	
	switch (member.type)
	{
		case 'int32':
		case 'int64':
		case 'uint32':
		case 'uint64':
		case 'sint32':
		case 'sint64':
		case 'enum':
			encodeVarInt(buf, member, val);
			break;
		case 'bool':
			encodeBool(buf, member, val);
			break;
		case 'fixed64':
		case 'sfixed64':
		case 'double':
			encode64Bit(buf, member, val);
			break;
		case 'string':
			encodeString(buf, member, val);
			break;
		case 'bytes':
		case 'message':
		case 'packed':
			encodeLengthDelimited(buf, member, val);
			break;
		case 'fixed32':
		case 'sfixed32':
		case 'float':
			encode32Bit(buf, member, val);
			break;
		default:
			throw new TypeError('Unknown Protobuf type: ' + member.type);
	}
}

/**
 * @param buf {AutoBuffer}
 * @param member {ProtoMember}
 * @param val {number}
 */
function encode32Bit (buf, member, val)
{
	writeVarInt(buf, 'uint32', (member.index << 3) | _32BIT);
	
	if (member.type === 'float')
	{
		buf.writeFloatLE(val);
	}
	else
	{
		if (member.type === 'sfixed32')
			buf.writeInt32LE(val);
		else
			buf.writeUInt32LE(val, true);
	}
}

/**
 * @param buf {AutoBuffer}
 * @param member {ProtoMember}
 * @param val {number}
 */
function encode64Bit (buf, member, val)
{
	writeVarInt(buf, 'uint32', (member.index << 3) | _64BIT);
	
	if (member.type === 'double')
	{
		buf.writeDoubleLE(val);
	}
	else
	{
		var long = Long.fromNumber(val, member.type === 'fixed64');
		buf.writeUInt32LE(long.low, true);
		buf.writeUInt32LE(long.high, true);
	}
}

/**
 * @param buf {AutoBuffer}
 * @param member {ProtoMember}
 * @param val {boolean}
 */
function encodeBool (buf, member, val)
{
	writeVarInt(buf, 'uint32', (member.index << 3) | _VARINT);
	buf.writeUInt8(val ? 1 : 0);
}

/**
 * @param buf {AutoBuffer}
 * @param member {ProtoMember}
 * @param val {*}
 */
function encodeLengthDelimited (buf, member, val)
{
	writeVarInt(buf, 'uint32', (member.index << 3) | _LEN_DELIMITED);
	// todo: implement
}

/**
 * @param buf {AutoBuffer}
 * @param member {ProtoMember}
 * @param str {string}
 */
function encodeString (buf, member, str)
{
	writeVarInt(buf, 'uint32', (member.index << 3) | _LEN_DELIMITED);
	writeVarInt(buf, 'uint32', Buffer.byteLength(str, 'utf8'));
	buf.writeString(str);
}

/**
 * @param buf {AutoBuffer}
 * @param member {ProtoMember}
 * @param val {number}
 */
function encodeVarInt (buf, member, val)
{
	writeVarInt(buf, 'uint32', (member.index << 3) | _VARINT);
	writeVarInt(buf, member.type, val);
}

function writeVarInt (buf, type, val)
{
	var i, byte, highBit;

	if (val > 0x7fffffff || val < MIN_INT32)
	{
		// val is a long
		/** @type {Long} */
		var long = Long.fromNumber(val, type === 'uint64');
		if (type === 'sint64')
			long = zigZag64(long);

		var notLastSeven = Long.fromNumber(127).not();

		for (i = 0; i < 10; i++)
		{
			highBit = long.and(notLastSeven).isZero() ? 0 : 128;
			byte = highBit | (long.low & 127);
			buf.writeUInt8(byte);

			if (highBit !== 128)
				break;

			long = long.shiftRightUnsigned(7);
		}
	}
	else
	{
		if (type === 'sint32')
			val = zigZag32(val);

		for (i = 0; i < 5; i++)
		{
			highBit = (~127 & val) ? 128 : 0;
			byte = highBit | (val & 127);
			buf.writeUInt8(byte);

			if (highBit !== 128)
				break;

			val = val >>> 7;
		}
	}
}

/**
 * @param val {number}
 */
function zigZag32 (val)
{
	return (val << 1) ^ (val >> 31);
}

/**
 * @param long {Long}
 */
function zigZag64 (long)
{
	return long.shiftLeft(1).xor(long.shiftRight(63));
}
