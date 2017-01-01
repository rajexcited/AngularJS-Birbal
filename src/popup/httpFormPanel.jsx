class HttpFormPanel extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            httpMethod: props.method,
            headerList: props.headerList
        };
        this.elm = {};
        this.HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "JSONP", "PATCH", "HEAD"];
        this.handleSubmit = this.handleSubmit.bind(this);
        this.resetForm = this.resetForm.bind(this);
        // init or reset the form
        var THIS = this;
        this.resetForm(()=> {
            if (THIS.props.updateInitErrorState) {
                var httpErrorState = THIS.getState();
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

        $(this.elm.url).typeahead(null, {source: findMatches});
        birbalJS.logger.info('componentDidMount for ' + this.props.name);
        var THIS = this;
        $("#collapse-" + this.props.name).on("openingForm", function () {
            THIS.showHelpPanel("method");
        });
    }

    getRegExpArgs(value) {
        // 2. verify regexp signature
        // 3. retrieve flags
        // 4. retrieve pattern
        // 5. validate regexp

        function retrievePattern(str) {
            // single quote
            // double quote
            var regmatched = str.match(/(['"\/])(.+)\1(?:,['"][a-z]*['"])$/);
            if (regmatched) {
                return regmatched[2];
            }
            regmatched = str.match(/(['"\/])(.+)\1(?:,['"][a-z]*['"])?$/);
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
        var flags = value.replace(pattern, '').replace(/['"\/,]/g, '');
        //#5
        new RegExp(pattern, flags);
        birbalJS.logger.log.bind(null, 'regex  ').call(null, {pattern: pattern, flags: flags});
        return {pattern: pattern, flags: flags};
    }

    validateURLRegexp(errorState) {
        // 1. get value
        // 2. verify and validate regExp expression
        try {
            //#1
            this.getRegExpArgs(this.elm.url.value);
        } catch (e) {
            // not valid
            errorState.url = errorState.url.concat(',regexInvalid');
        }
    }

    getState() {
        var errorState = {}, elm;
        // required state
        for (var name in this.elm) {
            elm = this.elm[name];
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
            url: this.elm.url.value,
            status: this.elm.status.value,
            response: this.elm.responseData.value,
            headers: this.elm.headers.getValue(),
            method: this.elm.httpMethod.getValue()
        };
        try {
            httpMock.url = this.getRegExpArgs(httpMock.url);
        } catch (e) {
        }
        var httpErrorState = this.getState();
        this.hideHelpPanel();
        this.props.save(httpMock, httpErrorState);
        // reset the form
        this.resetForm();
    }

    validateForm() {
        var httpErrorState = this.getState();
        for (var name in httpErrorState) {
            if (httpErrorState[name].length !== 0) {
                ReactDOM.findDOMNode(this.elm[name]).parentElement.classList.add('has-error');
            } else {
                birbalJS.logger.log.bind(this, 'element of no error: ').call(this, ReactDOM.findDOMNode(this.elm[name]));
                ReactDOM.findDOMNode(this.elm[name]).parentElement.classList.remove('has-error');
            }
        }
    }

    resetForm(callback) {
        var THIS = this;
        this.hideHelpPanel();
        window.setTimeout(function () {
            THIS.setState({
                httpMethod: THIS.props.method || THIS.HTTP_METHODS[0],
                headerList: THIS.props.headerList || []
            });
            THIS.elm.url.value = THIS.props.url || "";
            THIS.elm.responseData.value = THIS.props.responseData || "";
            THIS.elm.status.value = THIS.props.status || "";
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
    }

    hideHelpPanel(panelName) {
        var panelList = panelName ? [panelName] : panelName;
        $(".http-input-help").trigger("help-panel:hide", panelList);
    }

    render() {
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
                                          selectedItem={this.state.httpMethod}
                                          ref={(dropdown) => { this.elm.httpMethod = dropdown; }}/>
                                <input className="form-control" type="text" aria-label="request URL"
                                       onFocus={this.showHelpPanel.bind(this,"url")}
                                       onBlur={this.validateForm.bind(this,"url")} data-http-required="true"
                                       placeholder="Enter URL or RegExp key word"
                                       defaultValue={this.props.url} ref={(input) => { this.elm.url = input; }}/>
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
                                    <a aria-controls="response" role="tab" data-toggle="tab"
                                       onClick={this.hideHelpPanel.bind(this,"headers")}
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
                                               defaultValue={this.props.status}
                                               onFocus={this.showHelpPanel.bind(this,"status")}
                                               onBlur={this.validateForm.bind(this,"status")}
                                               ref={(input) => { this.elm.status= input; }}
                                        />
                                    </div>
                                    <div role="tabpanel" className="tab-pane fade" id={"response-"+this.props.name}>
                                        <textarea placeholder="Write your response output"
                                                  defaultValue={this.props.responseData}
                                                  onFocus={this.showHelpPanel.bind(this,"response")}
                                                  ref={(textarea) => { this.elm.responseData= textarea; }}></textarea>
                                    </div>
                                    <div role="tabpanel" className="tab-pane fade" id={"headers-"+this.props.name}>
                                        <HeaderInputList headerList={this.state.headerList}
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
