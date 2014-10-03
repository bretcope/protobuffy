"use strict";
/* -------------------------------------------------------------------
 * Require Statements << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

//

/* =============================================================================
 * 
 * AutoBuffer
 *  
 * ========================================================================== */

module.exports = AutoBuffer;

function AutoBuffer (lengthOrBuffer)
{
	this.buffer = Buffer.isBuffer(lengthOrBuffer) ? lengthOrBuffer : new Buffer(typeof lengthOrBuffer === 'number' ? lengthOrBuffer : 1024);
	this.position = 0;
}

/* -------------------------------------------------------------------
 * Prototype Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

AutoBuffer.prototype.ensureCapacity = function (bytesNeeded)
{
	bytesNeeded += this.position;
	if (bytesNeeded > this.buffer.length)
	{
		this.grow(bytesNeeded);
	}
};

AutoBuffer.prototype.grow = function (bytesNeeded)
{
	var newLen = this.buffer.length;
	do
	{
		newLen *= 2;
	}
	while (bytesNeeded > newLen);
	
	var buf = new Buffer(newLen);
	this.buffer.copy(buf, 0, 0, this.position);
	this.buffer = buf;
};

AutoBuffer.prototype.readUInt8 = createReader(Buffer.prototype.readUInt8);
AutoBuffer.prototype.readUInt16LE = createReader(Buffer.prototype.readUInt16LE);
AutoBuffer.prototype.readUInt16BE = createReader(Buffer.prototype.readUInt16BE);
AutoBuffer.prototype.readUInt32LE = createReader(Buffer.prototype.readUInt32LE);
AutoBuffer.prototype.readUInt32BE = createReader(Buffer.prototype.readUInt32BE);
AutoBuffer.prototype.readInt8 = createReader(Buffer.prototype.readInt8);
AutoBuffer.prototype.readInt16LE = createReader(Buffer.prototype.readInt16LE);
AutoBuffer.prototype.readInt16BE = createReader(Buffer.prototype.readInt16BE);
AutoBuffer.prototype.readInt32LE = createReader(Buffer.prototype.readInt32LE);
AutoBuffer.prototype.readInt32BE = createReader(Buffer.prototype.readInt32BE);
AutoBuffer.prototype.readFloatLE = createReader(Buffer.prototype.readFloatLE);
AutoBuffer.prototype.readFloatBE = createReader(Buffer.prototype.readFloatBE);
AutoBuffer.prototype.readDoubleLE = createReader(Buffer.prototype.readDoubleLE);
AutoBuffer.prototype.readDoubleBE = createReader(Buffer.prototype.readDoubleBE);

AutoBuffer.prototype.writeString = function (str)
{
	var maxLen = str.length * 2;
	this.ensureCapacity(maxLen);
	this.position += this.buffer.write(str, this.position, maxLen, 'utf8');
};

AutoBuffer.prototype.writeUInt8 = createWriter(Buffer.prototype.writeUInt8, 1);
AutoBuffer.prototype.writeUInt16LE = createWriter(Buffer.prototype.writeUInt16LE, 2);
AutoBuffer.prototype.writeUInt16BE = createWriter(Buffer.prototype.writeUInt16BE, 2);
AutoBuffer.prototype.writeUInt32LE = createWriter(Buffer.prototype.writeUInt32LE, 4);
AutoBuffer.prototype.writeUInt32BE = createWriter(Buffer.prototype.writeUInt32BE, 4);
AutoBuffer.prototype.writeInt8 = createWriter(Buffer.prototype.writeInt8, 1);
AutoBuffer.prototype.writeInt16LE = createWriter(Buffer.prototype.writeInt16LE, 2);
AutoBuffer.prototype.writeInt16BE = createWriter(Buffer.prototype.writeInt16BE, 2);
AutoBuffer.prototype.writeInt32LE = createWriter(Buffer.prototype.writeInt32LE, 4);
AutoBuffer.prototype.writeInt32BE = createWriter(Buffer.prototype.writeInt32BE, 4);
AutoBuffer.prototype.writeFloatLE = createWriter(Buffer.prototype.writeFloatLE, 4);
AutoBuffer.prototype.writeFloatBE = createWriter(Buffer.prototype.writeFloatBE, 4);
AutoBuffer.prototype.writeDoubleLE = createWriter(Buffer.prototype.writeDoubleLE, 8);
AutoBuffer.prototype.writeDoubleBE = createWriter(Buffer.prototype.writeDoubleBE, 8);

/* -------------------------------------------------------------------
 * Private Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

function createReader (method)
{
	return function ()
	{
		method.apply(this.buffer, arguments);
	};
}

function createWriter (method, size)
{
	return function (value, noAssert)
	{
		this.ensureCapacity(size);
		method.call(this.buffer, value, this.position, noAssert);
		this.position += size;
	};
}
