function HeaderInput(props) {
    return (
        <div className="row">
            <div className="col-xs-5">
                <input type="text" className="form-control" placeholder="key" value={props.item.key}
                       onFocus={props.addItem} onChange={props.updateKey}/>
            </div>
            <div className="col-xs-5">
                <input type="text" className="form-control" placeholder="value" value={props.item.value}
                       onFocus={props.addItem} onChange={props.updateValue}/>
            </div>
            <div><a>
                <span className="glyphicon glyphicon-remove" aria-hidden="true"
                      onClick={props.removeItem}></span>
            </a></div>
        </div>
    );
}

class HeaderInputList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {headers: []};
        this.addInput(-1);
    }

    componentWillReceiveProps(nextProps) {
        // any updates from parent
        if (nextProps === this.props) {
            // no change
            return;
        }
        var THIS = this;
        THIS.state.headers = [];
        THIS.addInput(-1);
        nextProps.headerList && nextProps.headerList.forEach(function (header, i) {
            var arr = header.split(':');
            THIS.updateHeader(i, 'key', arr[0])
            THIS.updateHeader(i, 'value', arr[1])
            THIS.addInput(i)
        });
    }

    addInput(ind) {
        var items = this.state.headers;
        if (items.length - ind === 1) {
            items.push({key: "", value: ""});
            this.setState({headers: items});
        }
    }

    removeInput(ind) {
        if (this.state.headers.length !== 1) {
            this.state.headers.splice(ind, 1);
            this.setState({headers: this.state.headers});
        }
    }

    updateHeader(i, k, e) {
        if (typeof e === 'string') {
            // text
            this.state.headers[i][k] = e;
        } else {
            // event
            this.state.headers[i][k] = e.target.value;
        }

        this.setState({headers: this.state.headers});
    }

    getValue() {
        return this.state.headers.map((h)=>(h.key ? (h.key + ":" + h.value) : "")).filter((item)=>(item !== ""));
    }

    render() {
        var THIS = this;
        return (<div className="headers-input">
            {
                THIS.state.headers.map(function (item, ind) {
                    return (
                        <HeaderInput item={item} addItem={THIS.addInput.bind(THIS, ind)}
                                     removeItem={THIS.removeInput.bind(THIS,ind)}
                                     updateKey={THIS.updateHeader.bind(THIS, ind, 'key')}
                                     updateValue={THIS.updateHeader.bind(THIS, ind, 'value')}/>
                    );
                })
            }
        </div>);
    }
}

