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
        var httpErrorState = this.getState();
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

                                <input type="text" className="form-control" aria-label="request URL"
                                       onBlur={this.validateForm.bind(this)}
                                       data-http-required="true" placeholder="Enter URL or regex URL"
                                       defaultValue={this.props.url} ref={(input) => { this.elm.url = input; }}/>
                            </div>
                        </div>
                        <div className="nav-container">
                            {/*<!-- Nav tabs -->*/}
                            <ul className="nav nav-pills" role="tablist">
                                <li role="presentation" className="active">
                                    <a aria-controls="status" role="tab" data-toggle="tab"
                                       data-target={"#status-"+this.props.name}>Status</a>
                                </li>
                                <li role="presentation">
                                    <a aria-controls="response" role="tab" data-toggle="tab"
                                       data-target={"#response-"+this.props.name}>Response</a>
                                </li>
                                <li role="presentation">
                                    <a aria-controls="headers" role="tab" data-toggle="tab"
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
                                               onBlur={this.validateForm.bind(this)}
                                               ref={(input) => { this.elm.status= input; }}
                                        />
                                    </div>
                                    <div role="tabpanel" className="tab-pane fade"
                                         id={"response-"+this.props.name}>
                                        <textarea placeholder="Write your response output"
                                                  defaultValue={this.props.responseData}
                                                  ref={(textarea) => { this.elm.responseData= textarea; }}></textarea>
                                    </div>
                                    <div role="tabpanel" className="tab-pane fade"
                                         id={"headers-"+this.props.name}>
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
