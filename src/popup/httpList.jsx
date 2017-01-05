class HttpList extends React.Component {

    constructor() {
        super();
        this.state = {httpList: [], listErrorIndicator: []};
        this.getStoredHttpList(this);
    }

    getErrorIndicator(item) {
        if (JSON.stringify(item).search(/required|invalid/i) !== -1) {
            return "list-group-item-danger";
        }
        return "";
    }

    addNewHttp(httpMock, httpErrorState) {
        var newList = this.state.httpList,
            newErrors = this.state.listErrorIndicator;
        newList.push(httpMock);
        // find any error and update it
        newErrors.push(this.getErrorIndicator(httpErrorState));
        this.setState({httpList: newList, listErrorIndicator: newErrors}, function () {
            // store http to storage
            birbalJS.requestBackGround(newList.filter((item)=>(!!item)), 'httpMock.updateList');
            //updateHttpList(newList.filter((item)=>(!!item)));
        });
    }

    updateExistingHttp(ind, httpMock, httpErrorState) {
        birbalJS.logger.log(arguments);
        var aList = this.state.httpList,
            newErrors = this.state.listErrorIndicator;
        aList[ind] = httpMock;
        // find any error and update it
        newErrors[ind] = this.getErrorIndicator(httpErrorState);
        this.setState({httpList: aList, listErrorIndicator: newErrors}, function () {
            // store http to storage
            birbalJS.requestBackGround(aList.filter((item)=>(!!item)), 'httpMock.updateList');
            //updateHttpList(aList.filter((item)=>(!!item)));
        });
    }

    getStoredHttpList(THIS) {
        // get from storage and init state
        new Promise(function (resolve) {
            //birbalJS.informBackground(null, 'httpMock.getMeList');
            birbalJS.requestBackGround(null, 'httpMock.getMeList',
                {name: 'httpMock.hereIsList', listener: resolve});
        }).then(function (httpList) {
            // on async resolve
            if (httpList) {
                var listErrorIndicator = [];
                httpList.forEach((http)=> {
                    http.url = birbalJS.toURL(http.url);
                    listErrorIndicator.push('');
                });
                THIS.setState({
                    httpList: THIS.state.httpList.concat(httpList),
                    listErrorIndicator: THIS.state.listErrorIndicator.concat(listErrorIndicator)
                });
            }
        });
    }

    initErrorState(ind, httpErrorState) {
        var newErrors = this.state.listErrorIndicator;
        newErrors[ind] = this.getErrorIndicator(httpErrorState);
        this.setState({listErrorIndicator: newErrors});
    }

    remove(ind, e) {
        this.state.httpList[ind] = undefined;
        this.state.listErrorIndicator[ind] = undefined;
        this.setState({httpList: this.state.httpList, listErrorIndicator: this.state.listErrorIndicator}, function () {
            // store http to storage
            //updateHttpList(this.state.httpList.filter((item)=>(!!item)));
            birbalJS.requestBackGround(this.state.httpList.filter((item)=>(!!item)), 'httpMock.updateList');
        });
        e.stopPropagation();
        e.preventDefault();
    }

    handleClick(e) {
        showEditHttpPanel(e);
    }

    render() {
        var THIS = this;
        return (
            <div className="list-group">
                {
                    this.state.httpList.map(function (http, ind) {
                        if (http) {
                            return (
                                <div className="list-item" data-list-item-id={'item-'+ind}>
                                    <button type="button" id={"url"+ind} data-toggle="collapse" aria-expanded="true"
                                            className={"list-group-item "+THIS.state.listErrorIndicator[ind]}
                                            data-target={"#collapse-url"+ind} onClick={THIS.handleClick}
                                            aria-controls={"collapse-url"+ind}>
                                    <span className="list-group-item-label">
                                        <span className="glyphicon glyphicon-trash remove"
                                              onClick={THIS.remove.bind(THIS,ind)}>
                                            <span className="badge">Trash it </span>
                                        </span>
                                        {http.url && http.url.toString()}
                                        <span className="open-me">Open</span>
                                    </span>
                                        <span className="badge">{http.method}</span>
                                    </button>
                                    <HttpFormPanel name={"url"+ind} responseData={http.response} url={http.url}
                                                   status={http.status} method={http.method} headerList={http.headers}
                                                   save={THIS.updateExistingHttp.bind(THIS,ind)} saveBtnText="Update"
                                                   updateInitErrorState={THIS.initErrorState.bind(THIS,ind)}></HttpFormPanel>
                                </div>
                            );
                        }
                    })
                }
            </div>
        );
    }
}

class HttpNewForm extends React.Component {

    constructor(props) {
        super(props);
        this.state = {resetToggle: true};
    }

    add(httpMock, httpErrorState) {
        this.props.httpList.addNewHttp(httpMock, httpErrorState);
        // dummy state to update the component with default values
        this.setState({resetToggle: !this.state.resetToggle});
    }

    render() {
        return (
            <HttpFormPanel name="new" saveBtnText="Add" save={this.add.bind(this)} responseData="" url="" status=""
                           noValidate="true" trigger-reset={this.state.resetToggle}> </HttpFormPanel>
        );
    }
}

$(function () {
    // link http list with new to add new to list
    var httpListElm = ReactDOM.render(
        <HttpList> </HttpList>
        , document.getElementById('http-list')
    );

    ReactDOM.render(<HttpNewForm httpList={httpListElm}/>, document.getElementById('http-new'));
    $("#new").on("click", showEditHttpPanel);

    $('#close-me').on('click', function () {
        window.close();
    });

    $(".http-input-help .ui-widget-content").draggable({containment: ".http-input-help", scroll: false}).resizable();

    $(".http-input-help")
        .on("help-panel:hide", function (event, panelName) {
            var panelSelector = panelName ? "." + panelName : "";
            birbalJS.logger.log("panelSelector = " + panelSelector);
            $(".http-input-help .ui-widget-content" + panelSelector).addClass("hide-me");
        })
        .on("help-panel:show", function (event, panelName) {
            var panelSelector = "." + panelName;
            birbalJS.logger.log("panelSelector = " + panelSelector);
            $(".http-input-help .ui-widget-content" + panelSelector).removeClass("hide-me");
        });

});


function showEditHttpPanel(event) {
    var targetId = "#collapse-" + event.currentTarget.id;
    $(targetId).trigger("openingForm");
    window.setTimeout(function () {
        var target = $(targetId);
        $('html, body').animate({
            scrollTop: target.offset().top - 15
        }, 300);
    }, 100);
}

//function getHttpMockFromStorage() {
//    return new Promise(function (resolve) {
//        //birbalJS.informBackground(null, 'httpMock.getMeList');
//        birbalJS.requestBackGround(null, 'httpMock.getMeList',
//            {name: 'httpMock.hereIsList', listener: resolve});
//    });
//}

//function updateHttpList(list) {
//    list = list || [];
//
//}