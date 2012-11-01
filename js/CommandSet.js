function AbstractEventDispatcher ( instance ) {

	instance._listenerMap = {};

	instance.indexOfListener = function ( listener, context, listenerSet ) {
		for ( var i = 0; i < listenerSet.length; i++ ) {
			if ( listener == listenerSet [ i ].listener && context == listenerSet [ i ].context ) {
				return i;
			}
		}

		return -1;
	}

	instance.addEventListener = function ( event, listener, context ) {
		if ( !this.hasEventListener ( event.toUpperCase (), listener, context ) ) {
            try {
                var listenerSet = this._listenerMap [ event.toUpperCase () ];
                listenerSet.push ( { listener : listener, context : context } );
            } catch ( error ) {
                this._listenerMap [ event.toUpperCase () ] = [ { listener : listener, context : context } ];
            }
		}
	}

	instance.removeEventListener = function ( event, listener, context ) {
		var listenerSet = this._listenerMap [ event.toUpperCase () ];
		if ( listenerSet ) {
			var indexOf = this.indexOfListener ( listener, context, listenerSet );
			if ( indexOf > -1 ) {
				listenerSet.splice ( indexOf, 1 );
			}
		}
	}

	instance.hasEventListener = function ( event, listener, context ) {

			// check if the
		var listenerSet = this._listenerMap [ event.toUpperCase () ];
		if ( listenerSet ) {
			if ( this.indexOfListener ( listener, context, listenerSet ) > -1 ) {
				return true;
			}
		}

		return false;
	}

	instance.dispatchEvent = function ( event, data ) {
		var listenerSet = this._listenerMap [ event.toUpperCase () ];

		if ( listenerSet ) {
			for ( var i = 0; i < listenerSet.length; i++ ) {
                listenerSet [ i ].listener.apply ( listenerSet [ i ].context, [ this, data ] );
                
			}
		}
	}

    return instance;
}

/*
*
* EventDispatcher
*
*/

function EventDispatcher () {

    AbstractEventDispatcher ( this );
	
	return this;
}

/*
*
* AbstractCommand
*
*/

function AbstractCommand ( instance, initId ) {

    AbstractEventDispatcher ( instance );

    instance._id = initId;
    instance._state;
	instance._async;

    instance._executeComplete = function () {
        this._state = "CommandState.EXECUTED";
		this.dispatchEvent ( "EXECUTE" ) ;
		this.release ( ) ;
    }

    instance._cancelComplete = function () {
        this._state = "CommandState.CANCEL";
		this.dispatchEvent ( "CANCEL" ) ;
		this.release ( ) ;
    }

    instance.id = function ( val ) {
    
    		// setter work-around
    	if ( typeof ( id ) !== String ( undefined ) )
    		this._id = val;
    
    		// getter
        return this._id;
    } ;

	instance.state = function () {
		return String ( this._state );
	};

    instance.async = function ( val ) {
    
    		// setter work-around
    	if ( typeof ( val ) !== String ( undefined ) )
    		this._async = val;
    		
    		// getter
        return this._async;
    };

    instance.release = function () {
        
	}

    instance.execute = function ( session ) {
       this._executeComplete ();
    }

    instance.cancel = function ( session ) {
       this._cancelComplete ();
    }

    instance.toString = function () {
        return "ICommand";
    }
}

/*
*
* AjaxCommand
*
*/

function AjaxCommand ( url, settings ) {

    AbstractCommand ( this, "AjaxCommand" );

    this._jqueryAjax;
    this._url = url;
    this._context = settings.context;
    this._complete = settings.complete;
    this._success = settings.success;
    this.data;

    this._ajaxComplete = function () {

        if ( this._complete ) {
            this._complete.apply ( this.context );
        }

        this._executeComplete ();
    }

    this._ajaxSuccess = function ( data ) {
        this.data = data;

        if ( this._success ) {
            if ( this._context ) {
                this.context._success ( data );
            } else {
                this._success ( data );
            }
        }
    }


    this.execute = function ( session ) {
        this._jqueryAjax = $.ajax ( this._url, this._settings );
    }

    this.cancel = function ( session ) {
       this._jqueryAjax.abort ();
       this._cancelComplete ();
    }

        // replace complete with our own complete callback , then callback original
    settings.context = this;
    settings.complete = this._ajaxComplete;
    settings.success = this._ajaxSuccess;

    this._settings = settings;

    return this;
}

/*
*
* CSSCommand
*
*/

function CSSCommand ( selector, cssProperties, parent ) {

    AbstractCommand ( this, "CSSCommand" );

    this._selector = selector;
    this._cssProperties = cssProperties;
	this._parent = parent;
	
    this.execute = function ( session ) {
		$( this._selector, this._parent ).css ( this._cssProperties );
        this._executeComplete ();
    }
}

/*
*
* ApplyCommand
*
*/

function ApplyCommand ( callback, params, conxtext ) {

    AbstractCommand ( this, "ApplyCommand" );

    this._callback = callback;
    this._params = params;
    this._context = conxtext;

    this.execute = function ( session ) {
        this._callback.apply( this._context, this._params );
        this._executeComplete ();
    }
}

/*
*
* LockCommand
*
*/

function LockCommand ( delay ) {

    AbstractCommand ( this, "LockCommand" );

    this._delay = delay;
    this._timeOut;

    this._timeOutComplete = function () {
        this._executeComplete ();
    }

    this.release = function () {
        if ( this._timeOut ) {
            clearTimeout ( this._timeOut );
        }
    }

    this.unlock = function () {
        this._executeComplete ();
        this._state = "CommandState.EXECUTED";
		this.dispatchEvent ( "EXECUTE" ) ;
		this.release ( ) ;
    }

    this.execute = function ( session ) {
		if ( this._delay ) {
			var context = this;
			this._timeOut = setTimeout ( function () { context._timeOutComplete () }, this._delay );
		}
    }

    this.cancel = function ( session ) {
        if ( this._timeOut ) {
            clearTimeout ( this._timeOut );
        }
        this._cancelComplete ();
    }
}

/*
*
* ListenerCommand
*
*/

function ListenerCommand ( target, event, listener, context ) {

    AbstractCommand ( this, "ListenerCommand" );

    this._target = target;
    this._event = event;
    this._listener = listener;
    this._context = context;

    this._onEventCaptured = function ( target, data ) {
        if ( this._listener ) {
            this._listener.apply ( this._context, [ target, data ] );
        }
		
		this._executeComplete ();
    }

    this.execute = function ( session ) {
        this._target.addEventListener ( this._event, this._onEventCaptured, this );
    }

    this.cancel = function ( session ) {
        this._target.removeEventListener ( this._event, this._listener, this._context );
        this._cancelComplete ();
    }
}

/*
*
* TweenCommand
*
*/

function TweenToCommand ( target, time, tweenObject ) {

    AbstractCommand ( this, "TweenCommand" );

    this._tweenCommand;
    this.target = target;
    this.time = time;
    this.tweenObject = tweenObject;
    this.onComplete = tweenObject.onComplete;
    
    	// replace onComplete function
    //this.tweenObject = 
    
    this.execute = function ( session ) {
    	//this._tweenCommand = TweenMax.to ( this.target, this.time,  );
    }

    this.cancel = function ( session ) {
        this._target.removeEventListener ( this._event, this._listener, this._context );
        this._cancelComplete ();
    }
}


/*
*
* CommandSet
*
*/

function CommandSet ( initId ) {
    this._commandSet = [];
	this._version = "1.01";
	this._id = initId;

    this.id = function () {
        return this._id;
    };

    this.length = function () {
        return this._commandSet.length;
    };

    this.getIterator = function () {
		return new Iterator ( this._commandSet );
	};

    this.unshift = function ( iCommand ) {
		this._commandSet.unshift ( iCommand );
	};

	this.push = function ( iCommand ) {
		this._commandSet.push ( iCommand );
	};

    this.apply = function ( callBack, params, context ) {
		var applyCommand = new ApplyCommand ( callBack, params, context );
		this._commandSet.push ( applyCommand );
		return applyCommand;
	};
	
	this.css = function ( selector, cssProperties ) {
		var cssCommand = new CSSCommand ( selector, cssProperties );
		this._commandSet.push ( cssCommand );
		return cssCommand;
	};
	
    this.ajax = function ( url, settings ) {
		var ajaxCommand = new AjaxCommand ( url, settings );
		this._commandSet.push ( ajaxCommand );
		return ajaxCommand;
	};

	this.tweenTo = function ( target, time, tweenProperties ) {
		var tweenCommand = new TweenCommand ( target, time, tweenProperties, true );
		this._commandSet.push ( tweenCommand );
		return tweenCommand;
	}

	this.tweenFrom = function ( target, time, tweenProperties ) {
		var tweenCommand = new TweenCommand ( target, time, tweenProperties, false );
		this._commandSet.push ( tweenCommand );
		return tweenCommand;
	}

	this.lock = function ( delay ) {
		var lockCommand = new LockCommand ( delay );
		this._commandSet.push ( lockCommand );
		return lockCommand;
	};

	this.dispatchEvent = function ( target, event, data ) {
		return this.apply ( target.dispatchEvent, [ event, data ], target );
	};

	this.listener = function ( target, event, listener, context ) {
		var listenerCommand = new ListenerCommand ( target, event, listener, context );
		this._commandSet.push ( listenerCommand );
		return listenerCommand;
	};

	this.assign = function ( target, property, value ) {
		return this.apply ( this._assign, [ target, property, value ] );
	};

	this._assign = function ( target, property, value ) {
		target [ property ] = value;
	};

	this.debug = function ( message ) {
        /* for( var i = 0; i < arguments.length; i++ ) {
            alert("This accident was caused by " + arguments[i]);
        } */

		this.apply ( console.log, [ message ] );
	};

	this.queue = function () {
        return new CommandQueue ( this, true );
	};

    this.toString = function () {
        return "CommandSet";
    };
}

/*
*
* CommandSet
*
*/

function Iterator ( array, index ) {

		// handle optional paramter
	if ( index === undefined ) {
		index = -1;
	}

    this._array = array;
    this._index = index;

		/*
		* private members
		*/
	function shuffleOrder () {
		return ( Math.round ( Math.random () ) - 0.5 );
	}
		/*
		* public members
		*/
	this.shuffle = function () {
		_array = this._array.sort ( shuffleOrder );
	}

	this.reverse = function () {
		this._array = _array.reverse ();
		if ( this._index > 0 ) {
			this._index = ( this._array.length - 1 ) - this._index;
		}
	}

	this.reset = function () {
		this._index = -1;
	}

	this.clone = function () {
		return new Iterator ( this._array.slice ( 0 ) ) ;
	}

	this.hasNext = function () {
		return ( ( this._index + 1 ) < this._array.length );
	}

	this.next = function () {
		return this._array [ ++this._index ];
	}

	this.hasPrevious = function () {
		return ( this._index > 0 );
	}

	this.previous = function () {
		return this._array [ --this._index ];
	}

	this.toArray = function () {
		return this._array.slice ( 0 );
	}
}

/*
*
* CommandQueue
*
*/

function CommandQueue ( commandSet, autoStart ) {

    AbstractEventDispatcher ( this );

	this._iIterator = new Iterator ( [] ); // IIterator;
	this._activeCommand; // ICommand;
	this._currentCommandSet; // CommandSet;

	this._commandSetQueue = [];
	this._isConsuming = false;

	this.session = { };

    this.activeCommand = function () {
        return thisactiveCommandid;
    };

    this.currentCommandSet = function () {
        return this._currentCommandSet;
    };


	this._isQueueEmpty = function () {
		return ( this._iIterator.hasNext ( ) || this._commandSetQueue.length ) ? false : true;
	}

	this.queue = function ( item ) {

		var commandSet;
		if ( item.toString () == "ICommand" ) {
			commandSet = new CommandSet ();
			commandSet.push ( item );
			this._commandSetQueue.push ( commandSet );
		} else if ( item.toString () == "CommandSet" ) {
			commandSet = item;
			if ( commandSet.length () ) {
				this._commandSetQueue.push ( item ) ;
			}
		} else {
			throw new Error ( "CommandQueue.queue ( ... ) argument must be either an ICommand or CommandSet" );
		}

		if ( !this._iIterator.hasNext () && this._commandSetQueue.length ) {
			var currentCommandSet = this._commandSetQueue.shift ();
			this._iIterator = currentCommandSet.getIterator ( ) ;
			this._currentCommandSet = currentCommandSet;
		}

		if ( this._isConsuming ) {
			this._consumeExecute ( );
		}
	}

    this.start = function () {
		this._isConsuming = true;
		this._consumeExecute ( );
	}

	this.stop = function () {
		this._isConsuming = false;
	}

    this.cancel = function () {
        this._consumeCancel ();
	}

    this._getNextCommand = function () {
		if ( !this._iIterator.hasNext () ) {
			var currentCommandSet = this._commandSetQueue.shift ();
			this._iIterator = currentCommandSet.getIterator ( ) ;
			this._currentCommandSet = currentCommandSet;
		}

		return this._iIterator.next ( ) ;
	}

	this._consumeExecute = function () {
		if ( this._activeCommand == null && !this._isQueueEmpty () ) {
			this._activeCommand = this._getNextCommand ();
			this._activeCommand.addEventListener ( "EXECUTE" , this._onCommandExecute_listener, this ) ;
			this._activeCommand.execute ( this.session ) ;
		}
	}

	this._consumeCancel = function () {
        if ( this._activeCommand ) {
			this._activeCommand.addEventListener ( "CANCEL" , this._onCommandCancel_listener, this ) ;
			this._activeCommand.cancel ( this.session ) ;
		} else if ( this._activeCommand == null && !this._isQueueEmpty () ) {
			this._activeCommand = this._getNextCommand ();
			this._activeCommand.addEventListener ( "CANCEL" , this._onCommandCancel_listener, this ) ;
			this._activeCommand.cancel ( this.session ) ;
		}
	}

    this._disposeOfCommand = function ( iCommand ) {
			// remove of all possible listeners
		iCommand.removeEventListener ( "EXECUTE" , this._onCommandExecute_listener, this ) ;
		iCommand.removeEventListener ( "CANCEL" , this._onCommandCancel_listener, this ) ;
	}

	this._onCommandExecute_listener = function ( target, data ) {

        //this._disposeOfCommand ( this._activeCommand ) ;
		this._activeCommand = null;

            // dispatch an execute command
		this.dispatchEvent ( "EXECUTE" ) ;

		if ( this._isQueueEmpty () ) {
			this.dispatchEvent ( "SEQUENCE_EXECUTED" );
			this.dispatchEvent ( "QUEUE_EMPTY" );
		}

			// unless the the commandQueue has been stopped continue consuming
		if ( this._isConsuming ) {
			this._consumeExecute ( ) ;
		}
	}

    this._onCommandCancel_listener = function ( commandEvent ) {

		this._disposeOfCommand ( this._activeCommand ) ;
		this._activeCommand = null;

			// dispatch an cancel command
		this.dispatchEvent ( "CANCEL" ) ;

		if ( this._isQueueEmpty () ) {
			this.dispatchEvent ( "SEQUENCE_EXECUTED" );
			this.dispatchEvent ( "QUEUE_EMPTY" );
		} else {
			this._consumeCancel ();
		}
	}

    if ( commandSet ) {
		this.queue ( commandSet );
	}

	if ( autoStart ) {
		this.start ();
	}

    return this;
}


/*
*
* CommandQueue.init ( element )
*
*/


CommandQueue.init = function ( element ) {

	function evalDataString ( dataString ) {
		
		var fixedDataString = dataString;
		var isJSONRegExp = /\s*{.*?}\s*/i;
		if ( isJSONRegExp.test ( dataString ) ) {
			
			// fix if there are no parenthesis, add them
			var regExpFix = /\({.*?}\)/i
			if ( !regExpFix.test ( dataString ) ) {
				fixedDataString = "(" + dataString + ")";
			}
		}
		
		return eval ( fixedDataString );
	}

	function queueCommandSet ( htmlCommandNode, commandSet ) {
		
		nodeName = htmlCommandNode.nodeName.toLowerCase ();
		
		var iCommand;
		switch ( nodeName ) {
			case "apply" :
				var callback = eval ( $( htmlCommandNode ).attr ( "callback" ) );
				var params = eval ( $( htmlCommandNode ).attr ( "params" ) );
				iCommand = commandSet.apply ( callback, params );
				break;
			case "ajax" :
				var url = $( htmlCommandNode ).attr ( "url" );
				var settings = evalDataString ( $( htmlCommandNode ).attr ( "settings" ) );
				iCommand = commandSet.ajax ( url, settings );
				break;
			case "css" :
				var selector = $( htmlCommandNode ).attr ( "selector" );
				var propeties = evalDataString ( $( htmlCommandNode ).attr ( "properties" ) );
				var parent = eval ( $( htmlCommandNode ).attr ( "parent" ) );
				iCommand = commandSet.css ( selector, propeties, parent );
				break;
			case "lock" :
				var delay = $( htmlCommandNode ).attr ( "delay" );
				iCommand = commandSet.lock ( delay );
				break;
			case "dispatchevent" :
				var target = evalDataString ( $( htmlCommandNode ).attr ( "target" ) );
				var event = $( htmlCommandNode ).attr ( "event" );
				var data = evalDataString ( $( htmlCommandNode ).attr ( "data" ) );
				iCommand = commandSet.dispatchEvent ( target, event, data );
				break;
			case "listener" :
				var target = evalDataString ( $( htmlCommandNode ).attr ( "target" ) );
				var event = $( htmlCommandNode ).attr ( "event" );
				var data = evalDataString ( $( htmlCommandNode ).attr ( "data" ) );
				iCommand = commandSet.listener ( target, event, data );
				break;
			case "assign" :
				var target = evalDataString ( $( htmlCommandNode ).attr ( "target" ) );
				var propery = $( htmlCommandNode ).attr ( "property" );
				var value = evalDataString ( $( htmlCommandNode ).attr ( "value" ) );
				iCommand = commandSet.assign ( target, event, data );
				break;
			case "debug" :
				var target = evalDataString ( $( htmlCommandNode ).attr ( "target" ) );
				var event = $( htmlCommandNode ).attr ( "event" );
				var data = evalDataString ( $( htmlCommandNode ).attr ( "data" ) );
				iCommand = commandSet.listener ( target, event, data );
				break;
		/*	
	}

	this.assign = function ( target, property, value ) {
		return this.apply ( this._assign, [ target, property, value ] );
	}


	this.debug
	*/
				
			default :
				alert ( "nothing found" );
		}
		
		
	}

	$ ( "commandQueue", element ).each ( function ( index, value ) {
	
		var parentHTMLNode = $ ( value ).parent ();
		
		try {
			var autoStart = ( $( value ).attr ( "autostart" ).toLowerCase () == "false" ) ? false : true;
		} catch ( error ) {
			autoStart = true;
		}
		
		var commandQueue = new CommandQueue ( null, autoStart );
		parentHTMLNode.commandQueue = commandQueue;
	
		$( "commandSet", this ).each ( function ( index, value ) {
			
			var commandSet = new CommandSet ();
			
			$( "*", value ).each ( function ( index, value ) {
				queueCommandSet ( value, commandSet );
			} );
			
			commandQueue.queue ( commandSet );
		} );
	} );
}