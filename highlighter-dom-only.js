function Highlighter (needle, elementName, className, caseSensitive) {
	this.caseSensitive = (typeof caseSensitive == "boolean") ? caseSensitive : false;
	this.elementName = elementName || "span";
	this.className = className || "highlight";
	this.needle = this.caseSensitive ? needle : needle.toLowerCase();
}

Highlighter.prototype.splitNode = function (node) {
		// gibt den letzten »fertigen« Knoten zurück (Textknoten ohne Treffer oder Highlight-Element)
		
		var haystack = node.nodeValue, needle = this.needle;
		//console.log("splitNode ", node);
		if (!this.caseSensitive) {
			haystack = haystack.toLowerCase();
		}
		
/*
		if (haystack == this.needle && node.parentNode.className == this.className) {
			//console.log("textknoten bereits in einem highlight-element, verlasse splitNode");
			return node;
		}
*/

		var needlePosition = haystack.indexOf(needle);
		if (needlePosition == -1) {
			//console.log("nadel nicht im heuhaufen gefunden, verlasse splitNode");
			return node;
		}
		//console.log("nadel im heuhaufen gefunden! needlePosition: ", needlePosition);
		
		var leadingNode, needleNode, trailingNode;
		
		if (needlePosition > 0) {
			leadingNode = node;
			needleNode = node.splitText(needlePosition);
		} else {
			needleNode = node;
		}
		needleNode.nodeValue.substring(needle.length);
		if (needleNode.nodeValue.length > needle.length) {
			trailingNode = needleNode.splitText(needle.length);
		}
		
		//console.log("gesplittet in leadingNode:", leadingNode, "  needleNode:", needleNode, "  trailingNode:", trailingNode);
		
		var highlightElement = document.createElement(this.elementName);
		highlightElement.className = this.className;
		needleNode.parentNode.replaceChild(highlightElement, needleNode);
		highlightElement.appendChild(needleNode);
		
		if (trailingNode) {
			//console.log("rufe splitText rekursiv auf für ", trailingNode, " \"" + trailingNode.nodeValue + "\"");
			return arguments.callee.call(this, trailingNode);
		} else {
			//console.log("kein trailingNode, gebe highlightElement zurück");
			return highlightElement;
		}
};

Highlighter.prototype.traverse = function (element) {
	//console.log("traverse(", element, ")");
	var node = element.firstChild;
	while (node) {
		//console.log(">>> untersuche ", node);
		if (node.nodeType == 3) {
			//console.log("knoten ist textknoten > splitten");
			node = this.splitNode(node);
		} else if (node.nodeType == 1) {
			//console.log("knoten ist element > rekursion");
			arguments.callee.call(this, node);
		}
		node = node.nextSibling;
	}

	//console.log("traverse von ", element, " beendet");
};