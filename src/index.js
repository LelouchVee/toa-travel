import "tachyons";
import "./style";
import * as refreshSvg from "./assets/icons/refresh-cw.svg";
import * as ghSvg from "./assets/icons/github.svg";
import * as logo from "./assets/toa-logo.png";

import { Component, render } from "preact";
import {
  addIndex,
  assoc,
  findIndex,
  map,
  pick,
  pipe,
  propEq,
  range,
  update
} from "ramda";
import * as Lockr from "lockr";

import { generateDay } from "./journey";
import JourneyDay from "./journey-day";
import WeatherKey from "./weather-key";

const MAX_DAYS = 365;
const DEFAULT_DAYS = 79;

const thClass = "bg-black light-gray pv2 ph3 fw3 f6 tl";

const genJourney = days => range(0, days).map(generateDay);

Lockr.prefix = "toa";

export default class App extends Component {
  mediaQuery = window.matchMedia("(max-device-width: 568px)");

  state = {
    dayCount: 1,
    journey: []
  };

  constructor(props) {
    super(props);

    this.state = {
      dayCount: 1,
      journey: [],
      isMobile: this.mediaQuery.matches
    };
  }

  componentDidMount() {
    const existing = Lockr.get("journey");
    this.mediaQuery.addListener(this.handleResize);

    if (!existing) {
      this.setState({
        dayCount: DEFAULT_DAYS,
        journey: genJourney(DEFAULT_DAYS)
      });
    } else {
      this.setState(JSON.parse(existing));
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return JSON.stringify(nextState) !== JSON.stringify(this.state);
  }

  componentDidUpdate(lastProps, lastState) {
    Lockr.set("journey", JSON.stringify(this.state));
  }

  componentWillMount() {
    this.mediaQuery.removeListener(this.handleResize);
  }

  render(props, { results = [] }) {
    const { dayCount, journey } = this.state;
    const elems = journey.map((d, i) => (
      <JourneyDay {...d} idx={i} onToggle={() => this.handleToggleDay(d.id)} />
    ));

    return (
      <section className="flex flex-column w-30-ns w-90 ma0-ns ma2 justify-center items-center">
        <h1 className="athelas f2 mt3 mb1">
          <img src={logo} width="500" alt="Tomb of Annihilation" />
        </h1>
        <h3 className="avenir f4-ns f5 mvt0 mb4-ns mb2 normal">
          Travelogue using hex-crawl rules by{" "}
          <a
            href="https://skaldforge.wordpress.com/2017/10/02/tomb-of-annihilation-hex-crawl-procedure/"
            target="_blank"
          >
            Kyle Maxwell
          </a>
        </h3>
        <div className="w-100">
          <div className="w-100 mv2 pa0 flex items-center avenir">
            <label htmlFor="day-count" className="mr1 f5-ns f6">
              Days to Generate (max {MAX_DAYS}):
            </label>
            <input
              type="number"
              onChange={this.handleChangeDays}
              onKeyDown={this.handleKeyDown}
              onBlur={this.handleChangeDays}
              min={1}
              max={MAX_DAYS}
              step={1}
              id="day-count"
              className="w-25 ph2 pv1 ba b--black-10"
              defaultValue={dayCount}
            />
            <button
              className="f6 link dim ba ph2 pv1 dib near-black pointer ml2 bg-transparent br2"
              title="Generate New Travelogue"
              onClick={this.handleRegen}
            >
              <img src={refreshSvg} className="icon" />
            </button>
          </div>
          <WeatherKey />
          <div className="w-100 ba b--black-30 mb3 relative f5-ns f6">
            <div className="w-100 overflow-x-auto">
              <table className="avenir collapse w-100-ns w-auto">
                <thead>
                  <th className={thClass}>Day</th>
                  <th className={thClass}>Weather</th>
                  <th className={`${thClass} tc`}>
                    Distance <small>(slow, fast)</small>
                  </th>
                  <th className={`${thClass} tc`}>
                    Direction <small>(if lost)</small>
                  </th>
                  <th className={`${thClass}`}>Encounters</th>
                </thead>
                <tbody>{elems}</tbody>
              </table>
              {this.renderMobileTable()}
            </div>
          </div>
          <p className="f7 tl avenir mh0">
            Code written by{" "}
            <a href="http://kevin-whitaker.net">Kevin Whitaker</a>.
          </p>
          <p className="f7 tl avenir mh0">
            Tomb of Annihilation copyright{" "}
            <a href="http://wizards.com">Wizards of the Coast</a>.
          </p>
          <p className="tl avenir mh0">
            <a
              href="https://github.com/kwhitaker/toa-travel"
              title="Fork on Github"
            >
              <img src={ghSvg} className="icon" />
            </a>
          </p>
        </div>
      </section>
    );
  }

  renderMobileTable() {
    const { isMobile, journey } = this.state;
    if (!isMobile || !journey.length) {
      return null;
    }

    const rows = pipe(
      map(pick(["hasPassed", "id"])),
      addIndex(map)((d, i) => (
        <JourneyDay
          {...d}
          idx={i}
          onToggle={() => this.handleToggleDay(d.id)}
          forMobile={true}
        />
      ))
    )(journey);

    return (
      <table className="avenir collapse w-auto absolute top-0 left-0 h-100 bg-white">
        <thead>
          <th className={thClass} style={{ height: "48px" }}>
            Day
          </th>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  }

  handleChangeDays = e => {
    const dayCount = parseInt(e.currentTarget.value);
    if (dayCount <= 0 || isNaN(dayCount) || dayCount > MAX_DAYS) {
      return;
    }

    this.setState({
      dayCount,
      journey: genJourney(dayCount)
    });
  };

  handleKeyDown = e => {
    if (e.keyCode !== 13) {
      return;
    }

    this.handleChangeDays(e);
  };

  handleToggleDay = id => {
    const { journey } = this.state;
    const idx = findIndex(propEq("id", id))(journey);
    const day = journey[idx];
    const updated = assoc("hasPassed", !day.hasPassed, day);
    this.setState({
      journey: update(idx, updated, journey)
    });
  };

  handleRegen = e => {
    e.preventDefault();
    Lockr.flush();
    this.setState({ journey: genJourney(this.state.dayCount) });
  };

  handleResize = e => {
    this.setState({
      isMobile: e.matches
    });
  };
}

if (typeof window !== "undefined") {
  render(<App />, document.getElementById("root"));
}
