class DroppableArea extends React.Component {

    constructor(props) {
        super(props);
        this.eventHandlers = {};
    }

    componentWillReceiveProps(nextProps) {
        // any updates from parent
        this.isOpen = !!nextProps.isOpening;
    }

    componentDidMount() {
        // Setup the dnd listeners.
        var droppableElement = $(this.self);
        var triggerHandler = function (handlerCallback) {
            var THIS = this;
            return function (evt) {
                evt.preventDefault();
                evt.dataTransfer.dropEffect = window.dropEffect;
                if (THIS.isOpen) {
                    handlerCallback(evt);
                }
            };
        }.bind(this);

        this.eventHandlers.dragenter = triggerHandler(function handleDragEnter(evt) {
            //console.log('handleDragEnter', evt);
            if (droppableElement.is(evt.target) || droppableElement.find(evt.target)[0]) {
                window.dropEffect = 'copy';
            } else {
                window.dropEffect = 'none';
            }
            evt.dataTransfer.dropEffect = window.dropEffect;
            droppableElement.find('.dragover').removeClass('hide-me-imp');
        });

        this.eventHandlers.dragover = triggerHandler(_.debounce(function handleDragOver(evt) {
            //console.log('handleDragOver', evt.target);
            droppableElement.find('.dragover').addClass('hide-me-imp');
        }, 200));

        this.eventHandlers.drop = triggerHandler(function handleFileSelect(evt) {
            // dropped on itself or one of its children
            if (droppableElement.is(evt.target) || droppableElement.find(evt.target)[0]) {
                //console.log('handleFileSelect', evt.target, evt);
                var files = evt.dataTransfer.files; // FileList object.
                var reader = new FileReader();
                droppableElement.find('.dragover:not(.hide-me-imp)').addClass('hide-me-imp');
                reader.onload = function (event) {
                    droppableElement[0].children[0].value = event.target.result;
                };
                reader.readAsText(files[0], "UTF-8");
            }
        });

        document.addEventListener('dragenter', this.eventHandlers.dragenter, false);
        document.addEventListener('dragover', this.eventHandlers.dragover, false);
        document.addEventListener('drop', this.eventHandlers.drop, false);
    }

    componentWillUnmount() {
        document.removeEventListener('dragenter', this.eventHandlers.dragenter);
        document.removeEventListener('dragover', this.eventHandlers.dragover);
        document.removeEventListener('drop', this.eventHandlers.drop);
    }

    render() {
        return (
            <div className="droppable-area" ref={(self) => { this.self= self; }}>
                {this.props.children}
                <div className="dragover hide-me-imp">
                    <div className="border-dragover">
                        <span className="content">DROP File</span>
                    </div>
                </div>
            </div> );
    }
}

class HttpFormPanel extends React.Component {

    constructor(props) {
        super(props);
        this.elm = {};
        this.HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "JSONP", "PATCH", "HEAD"];
        this.HTTP_RESPONSE_TYPES = ["Response text", "Response through file"];
        this.state = this.getDefaultStateValues(props);
        this.state.isOpening = false;
        this.handleSubmit = this.handleSubmit.bind(this);
        this.resetForm = this.resetForm.bind(this);
        // init or reset the form
        var THIS = this;
        this.resetForm(()=> {
            if (THIS.props.updateInitErrorState) {
                var httpErrorState = THIS.getErrorState();
                birbalJS.logger.log(THIS.props);
                THIS.props.updateInitErrorState(httpErrorState);
            }
        });
    }

    componentDidMount() {
        function findMatches(q, cb) {
            // an array that will be populated with substring matches
            var matches = [],
                str = "new RegExp";

            // regex used to determine if a string contains the substring `q`
            // contains the substring `q`, add it to the `matches` array
            if (new RegExp(q, 'i').test(str)) {
                matches.push(str.concat('("", "")'));
            }
            cb(matches);
        }

        // registered typeahead
        $(this.elm.url).typeahead(null, {source: findMatches});
        birbalJS.logger.info('componentDidMount for ' + this.props.name);
        var THIS = this;
        $("#collapse-" + this.props.name).on("openingForm", function () {
            THIS.showHelpPanel("method");
        });
        $("#collapse-" + this.props.name).on("show.bs.collapse  hide.bs.collapse", function (evt) {
            THIS.setState({isOpening: (evt.type === 'show')});
        });
    }

    getRegExpArgs(value) {
        // 2. verify regexp signature
        // 3. retrieve flags
        // 4. retrieve pattern
        function retrievePattern(str) {
            // single quote
            // double quote
            var regmatched = str.match(/(['"\/])(.+)\1(?:\s*,\s*['"]\w*['"])$/);
            if (regmatched) {
                return regmatched[2];
            }
            regmatched = str.match(/(['"\/])(.+)\1(?:\s*,\s*['"]\w*['"])?$/);
            return regmatched && regmatched[2];
        }

        //#1 & #2
        value = value.match(/^new RegExp\((.*)\)$/);
        if (!value) {
            return;
        }
        value = value[1];
        //#4
        var pattern = retrievePattern(value);
        //#3
        var flags = value.replace(pattern, '').replace(/['\"\/,]/g, '').trim();
        birbalJS.logger.log.bind(null, 'regex  ').call(null, {pattern: pattern, flags: flags});
        return {pattern: pattern, flags: flags};
    }

    validateURLRegexp(errorState) {
        // 1. get value
        // 2. verify and validate regExp expression
        // 5. validate regexp
        try {
            //#1
            var regexObject = this.getRegExpArgs(this.elm.url.value);
            //#5
            if (regexObject) {
                new RegExp(regexObject.pattern, regexObject.flags);
            }
        } catch (e) {
            // not valid
            errorState.url = errorState.url.concat(',regexInvalid');
        }
    }

    getErrorState() {
        var errorState = {}, elm;
        // required state
        for (var name in this.elm) {
            elm = this.elm[name];
            if (!elm) {
                continue;
            }
            // initialize
            errorState[name] = "";
            if (elm.dataset && elm.dataset.httpRequired === 'true' && !(elm.value || elm.getValue && elm.getValue())) {
                errorState[name] = errorState[name].concat(',httpRequired');
            }
        }
        this.validateURLRegexp(errorState);
        return errorState;
    }

    handleSubmit(e) {
        e.preventDefault();
        var httpMock = {
            status: this.elm.status.value,
            headers: this.elm.headers.getValue(),
            method: this.elm.httpMethod.getValue()
        };
        if (this.state.httpResponseType === this.HTTP_RESPONSE_TYPES[0]) {
            httpMock.response = this.elm.responseData.value;
        } else {
            httpMock.fileResponse = this.elm.fileResponse.value;
            if (httpMock.fileResponse) {
                if (httpMock.fileResponse.indexOf('http') !== 0) {
                    httpMock.fileResponse = 'http://' + httpMock.fileResponse;
                }
            }
        }

        try {
            httpMock.url = birbalJS.toURL(this.getRegExpArgs(this.elm.url.value));
        } finally {
            httpMock.url = httpMock.url || this.elm.url.value;
        }
        var httpErrorState = this.getErrorState();
        this.hideHelpPanel();
        this.props.save(httpMock, httpErrorState);
        // reset the form
        //this.resetForm();
    }

    validateForm() {
        var httpErrorState = this.getErrorState(),
            classList;
        for (var name in httpErrorState) {
            classList = ReactDOM.findDOMNode(this.elm[name]).parentElement.classList;
            if (httpErrorState[name].length !== 0) {
                classList.add('has-error');
            } else {
                classList.remove('has-error');
            }
        }
    }

    // generate from properties
    getDefaultStateValues(props) {
        if (!props) {
            props = this.props;
        }
        var stateValues = {
            httpMethod: props.method || this.HTTP_METHODS[0],
            headerList: props.headerList || []
        };
        if (props.responseData === undefined && props.fileResponse) {
            stateValues.httpResponseType = this.HTTP_RESPONSE_TYPES[1];
        } else {
            stateValues.httpResponseType = this.HTTP_RESPONSE_TYPES[0];
        }
        return stateValues;
    }

    resetForm(callback) {
        var THIS = this;
        this.hideHelpPanel();
        var defaultState = this.getDefaultStateValues();
        this.setState(defaultState);
        window.setTimeout(function () {
            if (THIS.state.httpResponseType === THIS.HTTP_RESPONSE_TYPES[1]) {
                // its file reference
                THIS.elm.fileResponse.value = THIS.props.fileResponse;
            } else {
                // default response data
                THIS.elm.responseData.value = THIS.props.responseData || "";
            }
            THIS.elm.url.value = (THIS.props.url && THIS.props.url.toString()) || "";
            THIS.elm.status.value = THIS.props.status || "200";
            if (typeof callback === 'function') {
                callback();
            }
            if (!THIS.props.noValidate) {
                THIS.validateForm();
            }
        }, 200);
    }

    showHelpPanel(panelName) {
        var panelList = panelName ? [panelName] : panelName;
        $(".http-input-help").trigger("help-panel:hide");
        $(".http-input-help").trigger("help-panel:show", panelList);
        if (panelName === 'response') {
            $('.nav.nav-pills li .btn.dropdown-toggle').addClass('btn-primary');
        } else {
            $('.nav.nav-pills li .btn.dropdown-toggle').removeClass('btn-primary');
        }
    }

    hideHelpPanel(panelName) {
        var panelList = panelName ? [panelName] : panelName;
        $(".http-input-help").trigger("help-panel:hide", panelList);
        if (panelName === 'response') {
            $('.nav.nav-pills li .btn.dropdown-toggle').addClass('btn-primary');
        } else {
            $('.nav.nav-pills li .btn.dropdown-toggle').removeClass('btn-primary');
        }
    }

    selectResponseType(value) {
        this.setState({httpResponseType: value});
    }

    selectMethod(method) {
        this.setState({httpMethod: method});
    }

    render() {
        function responseBody() {
            if (this.state.httpResponseType === this.HTTP_RESPONSE_TYPES[0]) {
                return (
                    <DroppableArea isOpening={this.state.isOpening}>
                    <textarea placeholder="Write your response output or drag and drop a file to it"
                              onFocus={this.showHelpPanel.bind(this,"response")}
                              ref={(textarea) => { this.elm.responseData= textarea; }}/>
                    </DroppableArea>);
            } else {
                return (
                    <div>
                        <input type="text" placeholder="Please Enter full file location http or local"
                               data-http-required="true" onFocus={this.showHelpPanel.bind(this,"response")}
                               defaultValue={this.props.fileResponse} className="form-control"
                               ref={(input) => { this.elm.fileResponse= input; }}/>
                    </div>);
            }
        }

        return (
            <form name={"collapse-form-"+this.props.name} onSubmit={this.handleSubmit}>
                <div className="panel panel-default collapse" role="http-mock-panel"
                     aria-labelledby={this.props.name} id={"collapse-"+this.props.name}>
                    <div className="panel-heading http-panel-heading">
                        <button type="button" className="btn btn-default btn-xs" aria-label="back or cancel"
                                id={"back-"+this.props.name} data-toggle="collapse" onClick={this.resetForm}
                                data-target={"#collapse-"+this.props.name} aria-expanded="true"
                                aria-controls={"collapse-"+this.props.name}>
                            <span>Back / Cancel</span>
                        </button>
                        <button type="submit" className="btn btn-default btn-sm add-btn" aria-label="add"
                                data-toggle="collapse" data-target={"#collapse-"+this.props.name} aria-expanded="true"
                                aria-controls={"collapse-"+this.props.name}>
                            <span>{this.props.saveBtnText}</span>
                        </button>
                    </div>
                    <div className="panel-body panel-collapse">
                        <div>
                            <div className="input-group">
                                <Dropdown className="input-group-btn" items={this.HTTP_METHODS}
                                          selectedItem={this.state.httpMethod} onSelect={this.selectMethod.bind(this)}
                                          ref={(dropdown) => { this.elm.httpMethod = dropdown; }}/>
                                <input className="form-control" type="text" aria-label="request URL or RegExp"
                                       onFocus={this.showHelpPanel.bind(this,"url")}
                                       onBlur={this.validateForm.bind(this)} data-http-required="true"
                                       placeholder="Enter URL or RegExp key word" defaultValue={this.props.url}
                                       ref={(input) => { this.elm.url = input; }}/>
                            </div>
                        </div>
                        <div className="nav-container">
                            {/*<!-- Nav tabs -->*/}
                            <ul className="nav nav-pills" role="tablist">
                                <li role="presentation" className="active">
                                    <a aria-controls="status" role="tab" data-toggle="tab"
                                       onClick={this.hideHelpPanel.bind(this,"headers")}
                                       data-target={"#status-"+this.props.name}>Status</a>
                                </li>
                                <li role="presentation">
                                    <a className="dropdown" aria-controls="response" role="tab" data-toggle="tab"
                                       onClick={this.showHelpPanel.bind(this,"response")}
                                       data-target={"#response-"+this.props.name}>Response</a>
                                </li>
                                <li role="presentation">
                                    <a aria-controls="headers" role="tab" data-toggle="tab"
                                       onClick={this.showHelpPanel.bind(this,"headers")}
                                       data-target={"#headers-"+this.props.name}>Request Headers</a>
                                </li>
                            </ul>
                            {/*<!-- Tab panes -->*/}
                            <div className="all-tab-contents">
                                <div className="tab-content">
                                    <div role="tabpanel" className={"tab-pane fade active in"}
                                         id={"status-"+this.props.name}>
                                        <input type="number" className="form-control" aria-label="http response status"
                                               placeholder="Enter Http Status number" data-http-required="true"
                                               onFocus={this.showHelpPanel.bind(this,"status")}
                                               onBlur={this.validateForm.bind(this)}
                                               ref={(input) => { this.elm.status= input; }}
                                        />
                                    </div>
                                    <div role="tabpanel" className="tab-pane fade" id={"response-"+this.props.name}>
                                        <div className="response-container">
                                            <Dropdown className="dropdown paddingBottom10px"
                                                      items={this.HTTP_RESPONSE_TYPES}
                                                      selectedItem={this.state.httpResponseType}
                                                      onSelect={this.selectResponseType.bind(this)}/>
                                            <div className="data">
                                                {responseBody.bind(this).call()}
                                            </div>
                                        </div>
                                    </div>
                                    <div role="tabpanel" className="tab-pane fade" id={"headers-"+this.props.name}>
                                        <HeaderInputList headerList={this.state.headerList}
                                                         onClick={this.showHelpPanel.bind(this,"headers")}
                                                         ref={(headers) => { this.elm.headers= headers; }}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        );
    }
}
