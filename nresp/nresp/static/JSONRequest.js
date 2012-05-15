/*
Script: JSONRequest.js

JSONRequest implementation:	
	This object is based on JSONRequest "official" draft and allows developers to perform get or post Ajax requestes in a simple way.
	
	With 3 public methods it's possible to manage more than a single request, using a queue to order requestes and to preserve server interactions.
	
	To know more about JSONRequest, please visit this page:  <http://www.json.org/JSONRequest.html>

Version:
	0.9 - probably requires more debug

Compatibility:
	FireFox - Version 1, 1.5, 2 and 3 (FireFox uses secure code evaluation)
	Internet Explorer - Version 5, 5.5, 6 and 7
	Opera - 8 and 9 (probably 7 too)
	Safari - Version 2 (probably 1 too)
	Konqueror - Version 3 or greater

Dependencies:
	<JSONRequestError.js>

Credits:
	- JSON site for draft, <http://www.json.org/JSONRequest.html>
	- Douglas Crockford to wrote above draft, <http://www.crockford.com/>

Author:
	Andrea Giammarchi, <http://www.3site.eu>

License:
	>Copyright (C) 2007 Andrea Giammarchi - www.3site.eu
	>	
	>Permission is hereby granted, free of charge,
	>to any person obtaining a copy of this software and associated
	>documentation files (the "Software"),
	>to deal in the Software without restriction,
	>including without limitation the rights to use, copy, modify, merge,
	>publish, distribute, sublicense, and/or sell copies of the Software,
	>and to permit persons to whom the Software is furnished to do so,
	>subject to the following conditions:
	>
	>The above copyright notice and this permission notice shall be included
	>in all copies or substantial portions of the Software.
	>
	>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
	>INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	>FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
	>IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	>DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
	>ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
	>OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*
Object: JSONRequest
	Personal JSONRequest implementation with queue and multiple exception filters.

Example:
	>try {
	>	JSONRequest.get("mypage.php", function(sn, response, exception){
	>		alert(exception || response);
	>	});
	>}
	>catch(e) {
	>	alert(e);
	>}
*/
JSONRequest = new function(){

	/* Section: Methods - Public */
	
	/*
	Method: cancel
		blocks a request and call user callback if request has been successful blocked adding 10 milliseconds as delay time for next interaction.
	
	Arguments:
		Number - A valid JSONRequest serial number.
	
	Example:
		>mybtn.serialNumber = JSONRequest.get("page?something", function(sn, result, error){alert(result)});
		>mybtn.onclick = function(){
		>	JSONRequest.cancel(this.serialNumber);
		>};
	*/
	this.cancel = function(i){
		if(i-- > 0 && i < queue.length && queue[i].timeout)
			cancel(i, new JSONRequestError("cancelled"));
		changeDelay(10);
	};
	
	/*
	Method: get
		prepares a request and push them inside queue. Throws a JSONRequest Exception if some parameter is wrong.
	
	Arguments:
		String - A valid url to call using Ajax respecting Same Origin Policy.
		Function - A callback with 3 arguments: serialNumber, responceObject, exceptionObject
	
	Returns:
		Number - A new valid serial number.
	
	Example:
		>JSONRequest.get("page.psp?var=value", function(sn, result, error){alert([sn, result, error])});
	
	Note:
		If callback has not 3 arguments this method will throw an exception.
		If request has not problems callback is called using only 2 arguments, serialNumber and responseObject.
		This method uses default JSONRequest timeout, 10 seconds.
	*/
	this.get = function(url, done){
		var	i = queue.length;
		method = "get";
		try{
			this.post(url, {}, done);
			queue[i].data = null;
			return i+1;
		} catch(e) {
			throw e
		}
	};
	
	/*
	Method: post
		prepares a request and push them inside queue. Throws a JSONRequest Error if some parameter is wrong.
	
	Arguments:
		String - A valid url to call using Ajax respecting Same Origin Policy.
		Array / Object - Data to send
		Function - A callback with 3 arguments: serialNumber, responceObject, exceptionObject
		[Number] - optional milliseconds timeout. Default: 10000
	
	Returns:
		Number - A new valid serial number.
	
	Example:
		>JSONRequest.post("page.psp?var=value", {name:"Andrea"}, function(sn, result, error){alert([sn, result, error])});
	
	Note:
		Server side will recieve a JSONRequest key with escaped JSON data (using encodeURIComponent).
		If data is not an Array, an Object or a valid JSON compatible variable, this method throws a JSONRequest Exception.
	*/
	this.post = function(url, send, done, timeout){
		var	i = queue.length;
		try {
			prepare(url, send, done, timeout || 10000);
			return i+1;
		} catch(e) {
			method = "post";
			queue[i] = {"timeout":0};
			changeDelay(500, 512);
			throw e;
		}
	};
	
	/* Section: Methods - Private */
	
	/*
	Method: cancel
		removes timeout and block XHR interaction. Changes queue index properties to save memory.
	
	Arguments:
		Number - A valid JSONRequest serial number.
		[JSONRequestError] - optional dedicated error
	*/
	function cancel(l, JSONRequestError){
		clearTimeout(queue[l].timeout);
		queue[l].xhr.onreadystatechange = function(){};
		queue[l].xhr.abort();
		if(JSONRequestError)
			queue[l].done(l + 1, null, JSONRequestError);
		queue[l] = {"timeout":0};
	};
	
	/*
	Method: changeDelay
		adds arbitrary delay time to internal variable.
	
	Arguments:
		Number - milliseconds to add
		[Number] - optional random milliseconds to add
	*/
	function changeDelay(a, b){
		delay += (a + Math.floor(Math.random() * b || 0));
		if(delay < 0)
			delay = 0;
	};
	
	/*
	Method: prepare
		checks every user get or post method arguments. Throws different JSONRequest Exceptions if these are not valid.
	
	Arguments:
		String - A valid url to call using Ajax respecting Same Origin Policy.
		Array / Object - Data to send
		Function - A callback with 3 arguments: serialNumber, responceObject, exceptionObject
		[Number] - optional milliseconds timeout. Default: 10000
	*/
	function prepare(url, send, done, timeout){
		var	i = queue.length,
			uri = url.indexOf(document.domain);
		if(uri > 8 || (uri === -1 && re.test(uri)))
			throw new JSONRequestError("bad URL");
		else if(parseInt(timeout) !== timeout || timeout < 0)
			throw new JSONRequestError("bad timeout");
		else if(done.constructor !== Function || done.length !== 3)
			throw new JSONRequestError("bad function");
		else {
			try {
				queue[i] = {"data":JSON.stringify(send), "done":done, "method":method, "send":true, "timeout":timeout, "url":url, "xhr":xhr()};
				if(queue[i].data === undefined || (send.constructor !== Array && send.constructor !== Object))
				    throw new JSONRequestError("in prepare");
			}
			catch(e) {
			    throw e; // new JSONRequestError("bad data")
			}
		};
	};
	
	/*
	Method: request
		interval callback, performs one request using queue and next available index.
	*/
	function request(){
		var	request = queue[l],
			data = null,
			xhr;
		if(delay < 0)
			delay = 0;
		if(!delay && request && request.timeout && request.send) {
			request.send = false;
			request.timeout = setTimeout(function(){
				changeDelay(500, 512);
				cancel(l++, new JSONRequestError("no response"));
			}, request.timeout);
			xhr = request.xhr;
			xhr.open(request.method, request.url, true);
			xhr.setRequestHeader("Content-Type", "application/jsonrequest");
			if(request.method === "post") {
				data = "JSONRequest=".concat(encodeURIComponent(request.data));
				xhr.setRequestHeader("Content-Length", data.length);
				xhr.setRequestHeader("Content-Encoding", "identity");
			};
			xhr.onreadystatechange = function(){
				if(xhr.readyState === 4) {
					if(xhr.status === 200) {
						clearTimeout(request.timeout);
						try {
                                                        var ctype = xhr.getResponseHeader("Content-Type");
							if(ctype === "application/jsonrequest") {
								request.done(l+1, JSON.parse(xhr.responseText));
								cancel(l);
								changeDelay(-10);
							}
							else
							    throw new JSONRequestError("wrong content type " + ctype);
						}
						catch(e) {
							changeDelay(500, 512);
						    cancel(l, e); // new JSONRequestError("bad response"));
						}
					}
					else {
						changeDelay(500, 512);
						cancel(l, new JSONRequestError("not ok, status = " + xhr.status));
					};
					l++;
				}
			};
			xhr.send(data);
		}
		else if(request && !request.timeout && l < queue.length - 1)
			l++;
		if(delay)
			delay -= 10;
	};
	
	/*
	Method: xhr
		creates a new XMLHttpRequest or ActiveX object.
	
	Returns:
		new XMLHttpRequest or new Microsoft.XMLHTTP ActiveX object
	*/
	function xhr(){
		return window.XMLHttpRequest ? new XMLHttpRequest : new ActiveXObject("Microsoft.XMLHTTP");
	};
	
	/* Section: Properties - Private */
	
	/*
	Property: Private
	
	List:
		Number - 'delay' - delay time for next interaction. Each error, except for cancel one, add a delay of 500 + rand(0, 511) milliseconds.
		Number - 'l' - queue index, used to perform one request each time.
		String - 'method' - temporary method used with request
		Array - 'queue' - a list of objects used for each interaction.
		RegExp - 're' - basic Regular Expression to verify url
	*/
	var	delay = 0,
		l = 0,
		method = "post",
		queue = [],
		re = /^(\s*)http/;
	setInterval(request, 10);
};
