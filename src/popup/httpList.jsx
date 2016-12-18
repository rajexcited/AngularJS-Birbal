class HttpList extends React.Component {

    constructor() {
        super();
        //this.state = {httpList: [{method: 'GET', url: 'http url 1', response: ''}]};
        this.state = {httpList: []};
        this.getStoredHttpList(this);
    }

    addNewHttp(httpMock) {
        var newList = this.state.httpList;
        newList.push(httpMock);
        this.setState({httpList: newList}, function () {
            // store http to storage
            updateHttpList(newList.filter((item)=>(!!item)));
        });
    }

    updateExistingHttp(ind, httpMock) {
        console.log(arguments);
        var aList = this.state.httpList;
        aList[ind] = httpMock;
        this.setState({httpList: aList}, function () {
            // store http to storage
            updateHttpList(aList.filter((item)=>(!!item)));
        });
    }

    getStoredHttpList(THIS) {
        // get from storage and init state
        getHttpMockFromStorage().then(function (httpList) {
            // on async resolve
            if (httpList) {
                THIS.setState({httpList: THIS.state.httpList.concat(httpList)});
            }
        });
    }

    remove(ind, e) {
        this.state.httpList[ind] = undefined;
        this.setState({httpList: this.state.httpList}, function () {
            // store http to storage
            updateHttpList(this.state.httpList.filter((item)=>(!!item)));
        });
        e.stopPropagation();
        e.preventDefault();
    }

    handleClick(e) {
        window.showEditHttpPanel(e);
    }

    render() {
        var THIS = this;
        return (
            <div className="list-group">
                {
                    this.state.httpList.map(function (http, ind) {
                        if (http) {
                            return (
                                <div data-list-item-id={'item-'+ind}>
                                    <button type="button" className="list-group-item" id={"url"+ind}
                                            data-toggle="collapse"
                                            data-target={"#collapse-url"+ind} aria-expanded="true"
                                            onClick={THIS.handleClick} aria-controls={"collapse-url"+ind}>
                                    <span className="list-group-item-label">
                                        <span className="glyphicon glyphicon-trash remove"
                                              onClick={THIS.remove.bind(THIS,ind)}>
                                            <span className="badge">Trash it </span>
                                        </span>
                                        {http.url}
                                        <span className="open-me">Open</span>
                                    </span>
                                        <span className="badge">{http.method}</span>
                                    </button>
                                    <HttpFormPanel name={"url"+ind} responseData={http.response} url={http.url}
                                                   status={http.status}
                                                   method={http.method} headerList={http.headers}
                                                   save={THIS.updateExistingHttp.bind(THIS,ind)}
                                                   saveBtnText="Save"></HttpFormPanel>
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

    add(httpMock) {
        this.props.httpList.addNewHttp(httpMock);
        this.setState({resetToggle: !this.state.resetToggle});
    }

    render() {
        return (
            <HttpFormPanel name="new" saveBtnText="Add" save={this.add.bind(this)} responseData="" url="" status=""
                           trigger-reset={this.state.resetToggle}> </HttpFormPanel>
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
    $("#new").on("click", window.showEditHttpPanel);
});


window.showEditHttpPanel = function (event) {
    var targetId = "#collapse-" + event.currentTarget.id;
    window.setTimeout(function () {
        var target = $(targetId);
        $('html, body').animate({
            scrollTop: target.offset().top - 15
        }, 300);
    }, 100);
}

window.getHttpMockFromStorage = function () {
    return new Promise(function (resolve) {
        birbalJS.requestBackGround(null, 'getHttpList', (list)=>(resolve(list)));
    });
};

window.updateHttpList = function (list) {
    list = list || [];
    birbalJS.requestBackGround(list, 'replaceHttpList');
};