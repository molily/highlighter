if (!window.console) {
	window.console = {
		log : function () {
			alert(Array.prototype.slice.apply(arguments).join(" "));
		}
	};
}

function Highlighter (needle, elementName, className, caseSensitive) {
	var self = this;
	
	self.needle = self.caseSensitive ? needle : needle.toLowerCase();
	self.needleLength = self.needle.length;
	
	elementName = elementName || "span";
	this.className = className = className || "highlight";
	var highlightElement = self.highlightElement = document.createElement(elementName);
	highlightElement.className = className;
	
	self.caseSensitive = (typeof caseSensitive == "boolean") ? caseSensitive : false;
	
	self.token = (++Highlighter.uuid).toString();
}

Highlighter.uuid = 0;

(function () {
	var textnode = document.createTextNode("foo");
	try {
		textnode.__foo = "bar";
		Highlighter.canAugmentTextNodes = true;
	} catch (e) {
		Highlighter.canAugmentTextNodes = false;
	}
	console.log("Highlighter.canAugmentTextNodes", Highlighter.canAugmentTextNodes);
})();

Highlighter.prototype.processed = function (node) {
	//console.log("processed?", node, node.__highlightDone, this.token);
	return Highlighter.canAugmentTextNodes ?
		node.__highlightDone == this.token :
		false;
};

Highlighter.prototype.markProcessed = function (node) {
	if (Highlighter.canAugmentTextNodes) {
		node.__highlightDone = this.token;
	}
};

Highlighter.prototype.splitTextNode = function (node) {
		// returns the last node which is »done« (a text node without matches or the the highlight element)
		
		var self = this,
			
			needle = self.needle,
			needleLength = self.needleLength,
			
			haystack = node.nodeValue,
			haystackLength = haystack.length,
			
			leadingNode,
			needleNode,
			trailingNode,
			
			highlightElement = self.highlightElement;
		
		//console.log("splitTextNode", node);
		
		/* Skip if the node has already been processed */
		if (self.processed(node)) {
			//console.log("skip node, already processed:", node);
			return node;
		}
		
		/* Skip if the needle is longer than the haystack. Skip whitespace nodes. */
		if (needle.length > haystack.length || node.isElementContentWhitespace) {
			self.markProcessed(node);
			return node;
		}
		
		if (!self.caseSensitive) {
			haystack = haystack.toLowerCase();
		}
		
		var needlePosition = haystack.indexOf(needle);
		if (needlePosition === -1) {
			/* Needle not found. Mark node as processed, return node. */
			self.markProcessed(node);
			return node;
		}
		
		//console.log("find!", node);
		
		/* Split into needle node, leading node and/or trailing node */
		
		/* Build leading node if necessary */
		if (needlePosition == 0) {
			needleNode = node;
		} else {
			leadingNode = node;
			needleNode = node.splitText(needlePosition);
			self.markProcessed(leadingNode);
		}
		self.markProcessed(needleNode);
		
		/* Build trailing node if necessary */
		if (needleNode.data.length > needleLength) {
			trailingNode = needleNode.splitText(needleLength);
			self.markProcessed(trailingNode);
		}
		
		//console.log("splitted into\nleadingNode:", leadingNode, "\nneedleNode:", needleNode, "\ntrailingNode:", trailingNode);
		
		/* Wrap the needle node with a clone of the highlight element */
		
		highlightElement = highlightElement.cloneNode(false);
		needleNode.parentNode.replaceChild(highlightElement, needleNode);
		highlightElement.appendChild(needleNode);
		
		if (trailingNode) {
			/* Process the trailing text, if necessary */
			//console.log("call splitText recursively for ", trailingNode);
			return this.splitTextNode(trailingNode);
		} else {
			/* If no trailing text exists, return the highlight element (necessary for the DOM implementation) */
			//console.log("no trailingNode, return highlightElement");
			return highlightElement;
		}
};

Highlighter.implementations = [
	
	{
		name : "Node Iterator",
		supported : function () {
			if (!document.createNodeIterator || !window.NodeFilter) {
				return false;
			}
			try {
				document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT, null, true);
				return true;
			} catch (e) {
				return false;
			}
		},
		traverse : function (element) {
			console.log("Node Iterator traverse");
			element = element || document.body;
			
			var ni = document.createNodeIterator(element, NodeFilter.SHOW_TEXT, null, true),
				node,
				token = this.token;
			
			while (node = ni.nextNode()) {
				this.splitTextNode(node);
			}
		}
	},
	
	{
		name : "Tree Walker",
		supported : function () {
			if (!document.createTreeWalker || !window.NodeFilter) {
				return false;
			}
			try {
				document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, true)
				return true;
			} catch (e) {
				return false;
			}
		},
		traverse : function (element) {
			console.log("Tree Walker traverse");
			element = element || document.body;
			
			var tw = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, true),
				node;
			
			for (node = tw.firstChild(); node; node = tw.nextNode()) {
				this.splitTextNode(node);
			}
		}
	},
	
	{
		name : "DOM",
		supported : function () {
			return !!(document.createTextNode("test").splitText)
		},
		traverse : function (element) {
			//console.log("DOM traverse");
			element = element || document.body;
			
			var node = element.firstChild,
				traverse = arguments.callee;
			
			while (node) {
				if (node.nodeType == 3) {
					//console.log("text node > splitTextNode");
					node = this.splitTextNode(node);
				} else if (node.nodeType == 1) {
					//console.log("element > recursion");
					traverse.call(this, node);
				}
				node = node.nextSibling;
			}
		}
	}
	
];

(function () {
	/* Set up the supported implementation */
	
	var implementations = Highlighter.implementations;
	
	for (var i = 0; implementation = implementations[i]; i++) {
		if (implementation.supported()) {
			console.log("Using ", implementation.name);
			Highlighter.prototype.traverse = implementation.traverse;
			break;
		}
	}
	
})();