class DropdownItem extends React.Component {

    handleClick() {
        this.props.onSelect(this.props.value);
    }

    render() {
        return (
            <li><a onClick={this.handleClick.bind(this)}>{this.props.value}</a></li>
        );
    }
}

class Dropdown extends React.Component {

    constructor(props) {
        super(props);
        this.state = {selected: props.selectedItem || props.items[0]};
        this.selectItem = this.selectItem.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        // any updates from parent
        if (nextProps === this.props) {
            // no change
            return;
        }
        var selectedItem = nextProps.selectedItem || nextProps.items[0];
        this.setState({selected: selectedItem});
    }

    selectItem(value) {
        this.setState({selected: value});
        if (this.props.onSelect) {
            this.props.onSelect(value);
        }
    }

    getValue() {
        // called by ref
        return this.state.selected;
    }

    render() {
        var THIS = this;
        return (
            <div className={THIS.props.className}>
                <button type="button" className="btn btn-default dropdown-toggle"
                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    {THIS.state.selected} <span className="caret"></span>
                </button>
                <ul className="dropdown-menu">
                    {
                        THIS.props.items.map(function (method) {
                            return <DropdownItem onSelect={THIS.selectItem} value={method}></DropdownItem>;
                        })
                    }
                </ul>
            </div>
        );
    }
}
