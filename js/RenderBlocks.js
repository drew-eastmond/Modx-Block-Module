// TODO : Try to build a better dependence towards using the JSONForm. Also rename this class its slightly misleading
// at the current moment this simply renders elements for a form. 

function JSONForm ( paramSet ) {
	
		/* saves the params so new forms can be easily rendered
		
		var example = {
			fieldSet : [
				{ legend : "Example", children : [ { label : "title", input : "text" }, { label : "Image", input : "image" } ] }.
				{ legend : "Example Area 2", children : [ { label : "title", input : "text" }, { label : "Image", input : "image" }, { label : "Image", input : "Custom HTML : <input type='hidden' />" } ] }
			]
		}
		*/
	this.paramSet = paramSet;
	
		// provides a html render to assign to to the innerHTML of any DOM element
	this.render = function ( values ) {
		
		var fieldSets = this.paramSet.fieldSets;
		var html = '';
		
			// loop through array and build a series of fieldSets. At least one should be provided
		for ( var i = 0; i < fieldSets.length; i++ ) {
			
				// render out a legend only if one exists
			var legend = ( typeof ( fieldSets [ i ].legend ) !== String ( undefined ) ) ? "<legend>" + fieldSets [ i ].legend + "</legend>" : "";
			html += "<fieldset>" + legend + "<ul class='inner-field-set'>";
			
				// render out each label : input combo
			var children = fieldSets [ i ].children;
			for ( var j = 0; j < children.length; j++ ) {
				html += "<li><div class='item-input-row'><label>" + children [ j ].label + "</label>" + this.getInputHTML (  "." + children [ j ].input, children [ j ] ) + "</div></li>";
			}
			
			html += "</ul></fieldset>";
		}
		
		return html;
		
	};
	
		// convenience function to render the output to, will replace the token if one is prvodied 
	this.inject = function ( html, token ) {
		if ( typeof ( token ) !== String ( undefined ) )
			return html.replace ( token, this.render () );
		
			// use default token
		return html.replace ( "{fieldset}", this.render () );
	}
	
	this.getInputHTML  = function ( type, params ) {
		return getInjectedTemplate ( type, params );
	}
	
}

	// Base class for all block items, and future custom ones ( which will most likely depend on a JSONForm )
function AbstractBlockItem ( instance, $container ) {
	
		// allows for addEventListener, removeEventListener, dispatchEvent. Important for centralizing updates
	AbstractEventDispatcher ( instance );
	
		// just a convience varaible to provide inheritence
	instance.super = {};
	
		// jQuery container instance
	instance.$container = $container;
	
		// Misc. Data for each item
	instance.data = {};
	
		// describes if the component "COLLAPSED" or "EXPANDED"
	instance.state = "COLLAPSED";
	
	
		// constructor function
	instance.init = function () {
	
		$container.find ( "#toggle_expanded_icon" ).click ( function ( e ) {
			
			if ( instance.state == "COLLAPSED" ) {
				instance.expand ();
			} else {
				instance.collapse ();
			}
			
		} );
	
			// do any standard updates, I MAY HAVE TO REMOVE SINCE THE MANAGER EXPLICITLY CALLS UPDATE
		instance.update ();
	}
	
		// default save handler. returns data for to be save as an formatting JSON object
	instance.save = function () {
		return instance.data;
	}
	
		// default load handler. Loads data from a JSON object
	instance.load = function ( data ) {
		instance.data = data;
	}
	
		// default expand handler
	instance.expand = function () {
		
			// if it's already expanded then just return
		if ( instance.state == "EXPANDED" )
			return;
		
			// toggle the expand state in HTML
		instance.state = "EXPANDED";
		$container.find ( ".collapsed" ).css ( 'display', 'none' );
		$container.find ( ".expanded" ).css ( 'display', 'block' );
		
		$container.find ( "#toggle_expanded_icon" ).attr ( "src", "images/toggle_collapse.png" );
		
			// do any standard updates
		instance.update ();
	}
	
		// provides the defautl basis for updates. matching the content to displays
	instance.update = function () {
		
			// first sync the data
		instance.sync ();
		
		$container.find ( ".render-block-menu" ).height ( $container.find ( ".content" ).height () );
		
		var marginTop = ( ( this.state == "EXPANDED" ) ? $container.outerHeight () : 150 - $ ( "#toggle_expanded_icon" ).height () ) * 0.5;
		$container.find ( "#toggle_expanded_icon" ).css ( 'margin-top', marginTop + 'px' );
		
			// delegates the render to each of the subclasses
		instance.render ();
	}
	
		// default collapse handler
	instance.collapse = function () {
		
		if ( instance.state == "COLLAPSED" )
			return;
		
			// toggle the expand state in HTML
		instance.state = "COLLAPSED";
		$container.find ( ".collapsed" ).css ( 'display', 'block' );
		$container.find ( ".expanded" ).css ( 'display', 'none' );
		
		$container.find ( "#toggle_expanded_icon" ).attr ( "src", "images/toggle_expand.png" );
		
			// do any standard updates
		instance.update ();
	}
	
		// automatically delegates the render to the correct function ( hopefully overriden in each of the subclasses )
	instance.render = function () {
		switch ( this.state ) {
			case 'COLLAPSED' :
				this.renderCollapsed ();
				break;
			case 'EXPANDED' :
				this.renderExpanded ();
				break;
		}	
	}
	
		// can be overridden
	instance.renderCollapsed = function () {
		
	}
	
		// can be overridden
	instance.renderExpanded = function () {
	
	}
		
		// can be overriden
	instance.addedToDOM = function () {
		
	}
	
		// should be overriden
	instance.sync = function () {
		throw "AbstractBlockItem::sync should be overriden";
	}
	
		// built in listeners
	instance.addEventListener ( "ADDED_TO_DOM", function ( data ) { instance.addedToDOM () } , instance );
	
	return instance;
}

	// Manages text content
function TextBlockItem ( $container, params ) {

		// order of operation is important here
	$container.html ( getTemplate ( "#text_block" ) );
	
		// build the form info
	var formInfo = {};
	formInfo.fieldSets = [ 
		{ legend : "GENERAL", children : [ 
				{ label : "title", input : "text", value : "" } 
			] 
		},
		{ legend : "DATA", children : [
				{ label : "title", input : "textarea", value : "" } 
			]
		}
	];

		// render the form out in the expanded HTML
	var jsonForm = new JSONForm ( formInfo );
	$container.html ( jsonForm.inject ( $container.html () ) );
	
		// get listener functionality
	var instance = AbstractBlockItem ( this, $container, params );
	
		// override sync function
	instance.sync = function () {
	
			// sync the data, not sure how to get around but the tinyMCE is never ready when the application first starts 
		try {
			var tinyMCEId = instance.$container.find ( "textarea.tiny-mce-textarea" ).attr ( "id" );
			instance.data.type = "text";
			instance.data.config = {} // can extend data
			instance.data.value = tinyMCE.get ( tinyMCEId ).getContent ();
		} catch ( e ) {
				// just a heads up a error was caught. More of a notification then anything else
			console.log ( "TextBlockItem data init" );
		}
	}
	
	instance.load = function ( params ) {
			// just return if there's no params
		if ( isUndefined ( params ) )
			return;
		
		instance.$container.find ( "textarea.tiny-mce-textarea" ).val ( decodeValue ( params.value ) );
	}
	
		// override to adde functionality after the textarea has been added to the DOM
	instance.addedToDOM = function () {
			// add the tinymce
		tinyMCE.execCommand ( "mceAddControl", true, instance.$container.find ( "textarea.tiny-mce-textarea" ).attr ( "id" ) );
	}
	
		
		// autoload if there are provided params
	instance.load ( params );
	
		// call init after overrides, order of execution is DEAD INPORTANT
	instance.init ();
	
	return instance;
}

	// manages image blocks
function ImageBlockItem ( $container, params ) {
	
		// order of operation is important here
	$container.html ( getTemplate ( "#image_block" ) );
	
		// build the form info
	var formInfo = {};
	formInfo.fieldSets = [ 
		{ legend : "GENERAL", children : [ 
				{ label : "title", input : "text", value : "testing" } 
			] 
		},
		{ legend : "DATA", children : [
				{ label : "Image Set", input : "item-set", value : "HTML GOODNESS" } 
			]
		}
	];
	
		// render the form out in the expanded HTML and attach a sortable handler
	var jsonForm = new JSONForm ( formInfo );
	$container.html ( jsonForm.inject ( $container.html () ) );
	$( ".ui-sortable", $container ).sortable ( { handle : ".item-drag-handle", activate: onUISortableActivate, stop: onUISortableStop } );
	
		// get listener functionality
	var instance = AbstractBlockItem ( this, $container, params );
	
		// TODO : try use jsonForm into insert form instead of 
	/* var listFormInfo = {};
	listFormInfo.fieldSets = [
		{ children : [
			{ label : "", input : "image-set-menu" },
			{ id : "title", label : "Title", input : "text" },
			{ id : "image", label : "", input : "image" },
			{ id : "rollover", label : "Rollover", input : "image" },
			{ id : "caption", label : "Caption", input : "text" },
			{ id : "alt", label : "Alt. Text", input : "text" }
		] }
	] 
	
	instance.listForm = new JSONForm ( listFormInfo ); */
	
	
		// adds a row to the list and attaches any needed functionality
	instance.addRow = function ( $after, params ) {
		
			// create a blank element
		var $li = $ ( document.createElement ( "li" ) );
		$li.html ( getInjectedTemplate ( ".image-slot", params ) );
		
			// set the select value manually
		if ( !isUndefined ( params ) && !isUndefined ( params [ 'link_type' ] ) )
			$li.find ( "select.link-type" ).val ( params [ 'link_type' ] );
		
		
			// add row handler
		$li.find ( ".add-row" ).click ( function ( e ) {
			instance.addRow ( $ ( this ) );
		} );
		
			// delete row handler. Removes elements and updates the components
		$li.find ( ".delete-row" ).click ( function ( e ) {
			instance.deleteRow ( $ ( this ).parent ().parent () );
		} )
		
		
			// TODO : Add nice animation effect used in MULTITV
			// inserts new row in the correct place
		if ( typeof ( $after ) !== String ( undefined ) ) {
			$li.insertAfter ( $after.parent ().parent () );
		} else {
			$container.find ( ".item-set-wrapper" ).append ( $li );
		}
		
			// standard update
		instance.update ();
	}
	
	instance.deleteRow = function ( $li ) {
			
			// remove the element from the list
		$li.remove ();
			
			// check if all elements were remove and automatically add an one if the list is empty
		if ( this.$container.find ( ".item-set-wrapper li" ).length == 0 )
			instance.addRow ();
			
			// standard update
		instance.update ();
	}
	
		// override sync function
	instance.sync = function () {
	
		var imageSet = [];
	
			// sync the data, loop through each fieldset and save the each of the variables
		instance.$container.find ( ".expanded fieldset .item-set-wrapper li" ).each ( function ( index ) {
			
			var data = extractFields ( $ ( this ) );
		
			imageSet.push ( data );
		} );
		
			// save the JSON to the value params
		instance.data.type = "image";
		instance.data.config = {} // can extend data
		instance.data.value = imageSet;
		
	}
	
		// override load function 
	instance.load = function ( params ) {
			// just return if there's no params
		if ( isUndefined ( params ) )
			return;
		
			// iterate over the value and add back in the blocks
		var imageSet = params.value;
		for ( var i = 0; i < imageSet.length; i++ )
			instance.addRow ( undefined, imageSet [ i ] );
			
			
	}
	
			// autoload if there are provided params
	instance.load ( params );
	
		// call init after overrides, order of execution is DEAD INPORTANT
	instance.init ();
	
		// If the list is empty, then add one row. Note if deleted, it should be automatically added again.
	if ( instance.$container.find ( ".expanded fieldset .item-set-wrapper li" ).length == 0 )
		instance.addRow ();
	
	
	return instance;
}

	// Manages listing blocks
function ListingBlockItem ( $container, params ) {
		// order of operation is important here
	$container.html ( getTemplate ( "#listing_block" ) );
	
		// build the form info
	var formInfo = {};
	formInfo.fieldSets = [ 
		{ legend : "GENERAL", children : [ 
				{ label : "title", input : "text", value : "testing" } 
			] 
		},
		{ legend : "DATA", children : [
				{ label : "Listing Icon", input : "image", value : "some file.jpg" },
				{ label : "Listing Set", input : "item-set", value : "" } 
			]
		}
	];
	
		// render the form out in the expanded HTML and attach a sortable handler
	var jsonForm = new JSONForm ( formInfo );
	$container.html ( jsonForm.inject ( $container.html () ) );
	$( ".ui-sortable", $container ).sortable ( { handle : ".item-drag-handle", activate: onUISortableActivate, stop: onUISortableStop } );
	
		// get listener functionality
	var instance = AbstractBlockItem ( this, $container, params );
	
		// adds a row to the list and attaches any needed functionality
	instance.addRow = function ( $after, params ) {
			
			// create a blank element
		var $li = $ ( document.createElement ( "li" ) );
		$li.html ( getInjectedTemplate ( ".listing-slot", params ) );
		
			// set the select value manually
		if ( !isUndefined ( params ) && !isUndefined ( params [ 'link_type' ] ) )
			$li.find ( "select.link-type" ).val ( params [ 'link_type' ] );
		
			// add row handler
		$li.find ( ".add-row" ).click ( function ( e ) {
			instance.addRow ( $ ( this ) );
		} );
		
			// delete row handler. Removes elements and updates the components
		$li.find ( ".delete-row" ).click ( function ( e ) {
			instance.deleteRow ( $ ( this ).parent ().parent () );
		} )
		
		
			// TODO : Add nice animation effect used in MULTITV
			// inserts new row in the correct place
		if ( typeof ( $after ) !== String ( undefined ) ) {
			$li.insertAfter ( $after.parent ().parent () );
		} else {
			$container.find ( ".item-set-wrapper" ).append ( $li );
		}
		
			// standard update
		instance.update ();
	}
	
	instance.deleteRow = function ( $li ) {
			
			// remove the element from the list
		$li.remove ();
			
			// check if all elements were remove and automatically add an one if the list is empty
		if ( this.$container.find ( ".item-set-wrapper li" ).length == 0 )
			instance.addRow ();
			
			// standard update
		instance.update ();
	}
	
	
		// override sync function
	instance.sync = function () {
	
		var listingSet = [];
	
			// sync the data, loop through each fieldset and save the each of the variables
		instance.$container.find ( ".expanded fieldset .item-set-wrapper li" ).each ( function ( index ) {
			
			var data = extractFields ( $ ( this ) );
			listingSet.push ( data );
		} );
		
			// save the JSON to the value params
		instance.data.type = "listing";
		instance.data.config = {} // can extend data
		instance.data.value = listingSet;
	}
	
		// override load function 
	instance.load = function ( params ) {
			// just return if there's no params
		if ( isUndefined ( params ) )
			return;
		
			// iterate over the value and add back in the blocks
		var listingSet = params.value;
		for ( var i = 0; i < listingSet.length; i++ )
			instance.addRow ( undefined, listingSet [ i ] );
			
			
	}
	
		// autoload if there are provided params
	instance.load ( params );
	
		// call init after overrides, order of execution is DEAD INPORTANT
	instance.init ();
	
		// If the list is empty, then add one row. Note if deleted, it should be automatically added again.
	if ( instance.$container.find ( ".expanded fieldset .item-set-wrapper li" ).length == 0 )
		instance.addRow ();
	
	
	return instance;
}

	// Manages listing blocks
function MultiHTMLBlockItem ( $container, params ) {
		// order of operation is important here
	$container.html ( getTemplate ( "#multi_html_block" ) );
	
		// build the form info
	var formInfo = {};
	formInfo.fieldSets = [ 
		{ legend : "GENERAL", children : [ 
				{ label : "title", input : "text", value : "testing" } 
			] 
		},
		{ legend : "DATA", children : [
				{ label : "HTML Blocks", input : "item-set", value : "" } 
			]
		}
	];
	
		// render the form out in the expanded HTML and attach a sortable handler
	var jsonForm = new JSONForm ( formInfo );
	$container.html ( jsonForm.inject ( $container.html () ) );
	$( ".ui-sortable", $container ).sortable ( { handle : ".item-drag-handle", activate: onUISortableActivate, stop: onUISortableStop } );
	
		// get listener functionality
	var instance = AbstractBlockItem ( this, $container, params );
	
		// adds a row to the list and attaches any needed functionality
	instance.addRow = function ( $after ) {
			
			// create a blank element, also assign tinymce functionality
		var $li = $ ( document.createElement ( "li" ) );
		$li.html ( getInjectedTemplate ( ".multi-html-slot" ) );		
		
			// add row handler
		$li.find ( ".add-row" ).click ( function ( e ) {
			instance.addRow ( $ ( this ) );
		} );
		
			// delete row handler. Removes elements and updates the components
		$li.find ( ".delete-row" ).click ( function ( e ) {
			instance.deleteRow ( $ ( this ).parent ().parent () );
		} )
		
			// TODO : Add nice animation effect used in MULTITV
			// inserts new row in the correct place
		if ( typeof ( $after ) !== String ( undefined ) ) {
			$li.insertAfter ( $after.parent ().parent () );
		} else {
			$container.find ( ".item-set-wrapper" ).append ( $li );
		}
		
		tinyMCE.execCommand ( "mceAddControl", true, $li.find ( "textarea.tiny-mce-textarea" ).attr ( "id" ) );
		
			// standard update
		instance.update ();
	}
	
	instance.deleteRow = function ( $li ) {
			
			// remove the element from the list
		$li.remove ();
			
			// check if all elements were remove and automatically add an one if the list is empty
		if ( this.$container.find ( ".item-set-wrapper li" ).length == 0 )
			instance.addRow ();
			
			// standard update
		instance.update ();
	}
	
	
		// override sync function
	instance.sync = function () {
	
		var htmlBlockSet = [];
	
			// sync the data, loop through each fieldset and save the each of the variables
		instance.$container.find ( ".expanded fieldset .item-set-wrapper li" ).each ( function ( index ) {
			
				// sync the data, not sure how to get around but the tinyMCE is never ready when the application first starts 
			try {
				var tinyMCEId = instance.$container.find ( ".expanded .tiny-mce-textarea" ).attr ( "id" );
				htmlBlockSet.push (  tinyMCE.get ( tinyMCEId ).getContent () );
			} catch ( e ) {
					// just a heads up a error was caught. More of a notification then anything else
				console.log ( "MultiHTMLBlockItem data init" );
			}
			
		} );
		
			// save the JSON to the value params
		instance.data.type = "multi_html";
		instance.data.config = {} // can extend data
		instance.data.value = htmlBlockSet;
	}
	
	
		// call init after overrides, order of execution is DEAD INPORTANT
	instance.init ();
	
		// override to adde functionality after the textarea has been added to the DOM
	instance.addedToDOM = function () {
			// start the list with one entry. Alsi wait till after it has been addded to the DOM for the tinyMCE functionality
		if ( instance.$container.find ( ".expanded fieldset .item-set-wrapper li" ).length == 0 )
			instance.addRow ();
	}
	
	
	
	return instance;
}



	// act as a like a factory. One instance multiple uses. In future possibly allow users to switch components on the fly
function RenderBlockItem ( $container, type, params ) {
	
		// add listener functionality
	var instance = AbstractEventDispatcher ( this );
	
		// attach the type of element as a member
	switch ( type ) {
		case "text" :
			instance.item = new TextBlockItem ( $container, params );
			break;
		case "image" :
			instance.item = new ImageBlockItem ( $container, params );
			break;
		case "listing" :
			instance.item = new ListingBlockItem ( $container, params );
			break;
		case "multi_html" :
			instance.item = new MultiHTMLBlockItem ( $container, params );
			break;
		default :
			throw new "Unknown Type assign to RenderBlockItem";
	}
	
		// delegate function
	instance.update = function () {
		instance.item.update ();
	}
	
	instance.save = function () {
		return instance.item.save ();
	}
	
		// delegate the expand call
	instance.expand = function () {
		this.item.expand ();
		this.dispatchEvent ( "EXPAND" );
	}
	
		// delegate the collapse call
	instance.collapse = function () {
		this.dispatchEvent ( "COLLAPSE" );
	}
	
		// override event listeners
	instance.addEventListener = function ( event, listener, context ) {
		instance.item.addEventListener ( event, listener, context );
	}

	instance.removeEventListener = function ( event, listener, context ) {
		instance.item.removeEventListener ( event, listener, context );
	}

	instance.dispatchEvent = function ( event, data ) {
		instance.item.dispatchEvent ( event, data );
	}
	
		// bind the $container to this instance;
	$.data ( $container.get ( 0 ), "RenderBlockItem", instance );
	
	return instance;
}


	// Manages adding, removing, and possibly filtering or any extra options
function RenderBlockManager ( $container ) {
	
	var instance = AbstractEventDispatcher  ( this );
	instance.$container = $container;
		
	instance.init = function init () {
			// get content ready
		instance.$container.html ( getInjectedTemplate ( "#render_block_manager" ) );
		instance.$container.find ( ".ui-sortable" ).sortable ( { handle : ".block-drag-handle", activate: onUISortableActivate, stop: onUISortableStop } );
		
			// add listeners
		$ ( "#block_select_button" ).click ( function ( e ) { 
			
			var blockType = instance.$container.find ( "#block_select" ).val ();
			
				// reject
			if ( blockType == "" )
				return;
			
				// add the block to the list
			instance.addBlock ( blockType );
		} );
	}
	
	instance.load = function ( jsonData ) {
		
			// operator overloading. Make sure ALL values are decoded… HERE'S the spot it all happens
		if ( typeof ( jsonData ) == "string" ) {
			jsonData = JSON.parse ( jsonData, jsonParse );
		}
		
		console.log ( jsonData );
		
			// iterate through each item and rebuild the list manually. Thank goodness for well structured code
		var blockData = jsonData.data;
		for ( var i = 0; i < blockData.length; i++ ) {
			instance.addBlock ( blockData [ i ].type, blockData [ i ] );
		}
	}
	
		// adds a block to the manager
	instance.addBlock = function ( type, params ) {
		
		var $li = $ ( document.createElement ( "li" ) );
		var renderBlockItem = new RenderBlockItem ( $li, type, params );
		
		
			// attach the container to the ul
		instance.$container.find ( "#render_block_list" ).append ( $li );
		renderBlockItem.dispatchEvent ( "ADDED_TO_DOM" );
		renderBlockItem.update ();
	}
	
		// removes block from the manager
	instance.deleteBlock = function ( renderBlockItem ) {
	
	}
	
	instance.save = function () {
		
		var blockInfo = [];
		
			// allow the HTML to store the block so we dont have to build a shadow array in javascript to track data
		instance.$container.find ( "ul#render_block_list" ).children ().each ( function ( index ) {
		
			var renderBlockItem = $.data ( $ ( this ).get ( 0 ), "RenderBlockItem" );
			
				// explicit update to sync the data
			renderBlockItem.update ();
			
			blockInfo.push ( renderBlockItem.save () );
			
		} );
		
		return { data : blockInfo, config : {} };
	}
	
		// init the render block
	instance.init ();
	
		// return the reference
	return instance;
};


/******************************************* STATIC / GLOBAL members *******************************************/

	// used to auto increment fields with no id
var idTemplateCounter = 0;

	// helper for strict browser safe undefined checking
function isUndefined ( value ) {
	return ( typeof ( value ) === String ( undefined ) );
}

	// helper functions for JSON.parse & JSON.stringify
function jsonParse ( key, value ) { 
			
		// only Strings need to be converted
	if ( typeof ( value ) === 'string' )
		return decodeValue ( value );
	
		// return parsed value untouched
	return value;

}

function jsonStringify ( key, value ) {
	
		// only Strings need to be converted
	if ( typeof ( value ) === 'string' )
		return encodeValue ( value );
	
		// return parsed value untouched
	return value;
}

	// helper to encode values to prevent ASCII like ' & " from breaking code ( used from http://www.ascii.cl/htmlcodes.htm )
function encodeValue ( value ) {
	value = value.replace ( /\'/g, "&#39;" );
	value = value.replace ( /\"/g, "&#34;" );
	value = value.replace ( /\`/g, "&#96;" );
	
	return value;
}

	// helper to encode values to prevent ASCII like ' & " from breaking code
function decodeValue ( value ) {
	return unescape ( value );
}

function addslashes(str) {
        str=str.replace(/\'/g,'\\\'');
        str=str.replace(/\"/g,'\\"');
        str=str.replace(/\\/g,'\\\\');
        str=str.replace(/\0/g,'\\0');
        return str;
}

function stripslashes(str) {
        str=str.replace(/\\'/g,'\'');
        str=str.replace(/\\"/g,'"');
        str=str.replace(/\\\\/g,'\\');
        str=str.replace(/\\0/g,'\0');
        return str;
}

	// ehelper to extract fields from each
function extractFields ( $container ) {
	var data = {};
	
	$container.find ( "div.item-input-row input, div.item-input-row textarea, div.item-input-row select," ).each ( function ( index ) {
		data [ $ ( this ).attr ( "name" ) ] = $ ( this ).val ();
	} );
	
	return data;
}


	// preserves tinyMCE instances when sorting starts
function onUISortableActivate ( event, ui ) {
	$ ( this ).find ( "textarea.tiny-mce-textarea" ).each ( function ( index ) {
    	var EditorID = $ ( this ).attr ( 'id' );
		if ( EditorID ){ 
			tinyMCE.execCommand ( "mceRemoveControl", false, EditorID );
		    $ ( this ).hide ();
		}
	} );
}

	// preserves tinyMCE instances when sorting stops
function onUISortableStop ( event, ui ) {
	$ ( this ).find ( "textarea.tiny-mce-textarea" ).each ( function ( index ) {
    	var EditorID = $ ( this ).attr ( 'id' );
			if ( EditorID ){ 
				$ ( this ).show ();
				tinyMCE.execCommand ( "mceAddControl", false, EditorID );
			}
	} ); 
}

	// retrieves the innerHTML from the selected element in the templates section 
function getTemplate ( selector ) {
	return $ ( "#_rb_templates" ).find ( selector ).html ();
} 

	// return the innerHTML from the selected element ( should one be present ), other returns the selector as custom HTML then injects content into each token
function getInjectedTemplate ( selector, params ) {
	var html = ( $ ( "#_rb_templates" ).find ( selector ).length ) ? $ ( "#_rb_templates" ).find ( selector ).html () : selector;
	
		// protect against empty params argument
	if ( typeof ( params ) === String ( undefined ) )
		params = {};
		
		// build a unique id if none is provided
	if ( typeof ( params.id ) === String ( undefined ) )
		params.id = "id_" + idTemplateCounter++;
	
		// injects data into each token or replaces it with a empty string
	var placeHoldersRegExp = /\{(.+?)\}/gi;
	while ( match = placeHoldersRegExp.exec ( html ) ) {
		var replaceVal = ( isUndefined ( params [ match [ 1 ] ] ) ) ? "" : params [ match [ 1 ] ];
		html = html.replace ( match [ 0 ], addslashes ( replaceVal ) );
	}
	
	
	return html;
} 