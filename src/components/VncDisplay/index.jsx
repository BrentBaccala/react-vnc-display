import { Component } from 'react';
import { arrayOf, string, bool, func, number, object } from 'prop-types';
import RFB from '@novnc/novnc/core/rfb';

/**
 * Map noVNC event names to properties on the React component.
 */

const events = {
  connect: 'onConnect',
  disconnect: 'onDisconnect',
  credentialsrequired: 'onCredentialsRequired',
  securityfailure: 'onSecurityFailure',
  clipboard: 'onClipboard',
  bell: 'onBell',
  desktopname: 'onDesktopName',
  capabilities: 'onCapabilities',
};

/**
 * Properties that map straight through into the noVNC object.
 */

// eslint-disable-next-line padding-line-between-statements
const passthroughProperties = [
  'viewOnly',
  'focusOnClick',
  'clipViewport',
  'dragViewport',
  'scaleViewport',
  'resizeSession',
  'showDotCursor',
  'background',
  'qualityLevel',
  'compressionLevel',
];

/**
 * React component to connect and display a remote VNC connection.
 */
export default class VncDisplay extends Component {
  static propTypes = {
    /**
     * The URL for which to create a remote VNC connection.
     * Should include the protocol, host, port, and path.
     */
    url: string.isRequired,
    /**
     * Customize the CSS styles of the canvas element with an object.
     */
    style: object,
    /**
     * If `style` is not specified, set the width of the canvas element.
     * If `style` is specified, `style` takes precedence and `width` must
     * be set in `style`.  Default is 1280.
     */
    width: number,
    /**
     * If `style` is not specified, set the height of the canvas element.
     * If `style` is specified, `style` takes precedence and `height` must
     * be set in `style`.  Default is 720.
     */
    height: number,
    /**
     * Specify a list of WebSocket protocols this connection should support.
     */
    wsProtocols: arrayOf(string),
    /**
     * Execute a function when the VNC connection connects.
     */
    onConnect: func,
    /**
     * Execute a function when the VNC connection disconnects.
     */
    onDisconnect: func,
    /**
     * Execute a function when VNC credentials are required.
     */
    onCredentialsdRequired: func,
    /**
     * Execute a function when the VNC security handshake fails.
     */
    onSecurityFailure: func,
    /**
     * Execute a function when the VNC connection's clipboard updates.
     */
    onClipboard: func,
    /**
     * Execute a function when an alert is raised on the VNC connection.
     */
    onBell: func,
    /**
     * Execute a function when the desktop name is entered for the connection.
     */
    onDesktopName: func,
    /**
     * Specify whether the VNC connection should be shared or should disconnect
     * other connections before connecting.  Default is true.
     */
    shared: bool,
    /**
     * Specify if events (e.g. key presses or mouse movement) should be
     * prevented from being sent to the server.  Default is false.
     */
    viewOnly: bool,
    /**
     * Specify if keyboard focus should automatically be moved to the remote
     * session when a `mousedown` or `touchstart` event is received.
     * Default is true.
     */
    focusOnClick: bool,
    /**
     * Specify if the remote session should be clipped to its container.  When
     * disabled scrollbars are shown.  Default is false.
     */
    clipViewport: bool,
    /**
     * Specify if mouse events should control the relative position of a
     * clipped remote session. Only relevant if `clipViewport` is enabled.
     * Default is false.
     */
    dragViewport: bool,
    /**
     * Specify if the remote session should be scaled locally so it fits its
     * container.  When disabled it will be centered if the remote session is
     * smaller than its container, or handled according to `clipViewport` if it
     * is larger.  Default is false.
     */
    scaleViewport: bool,
    /**
     * Specify if a request to resize the remote session should be sent whenever
     * the container changes dimensions.  Default is false.
     */
    resizeSession: bool,
    /**
     * Specify if a dot cursor should be shown instead of a zero-sized or
     * fully-transparent cursor if the server sets such invisible cursor.
     * Default is false.
     */
    showDotCursor: bool,
    /**
     * Specify a valid CSS background style value indicating which background
     * style should be applied to the element containing the remote session
     * screen.  Default is "rgb(40, 40, 40)" (solid gray color).
     */
    background: string,
    /**
     * An int in range [0-9] controlling the desired JPEG quality. Value 0
     * implies low quality and 9 implies high quality. Default value is 6.
     */
    qualityLevel: number,
    /**
     * An int in range [0-9] controlling the desired compression level. Value 0
     * means no compression. Level 1 uses a minimum of CPU resources and
     * achieves weak compression ratios, while level 9 offers best compression
     * but is slow in terms of CPU consumption on the server side. Use high
     * levels with very slow network connections. Default value is 2.
     */
    compressionLevel: number,
  };

  static defaultProps = {
    style: null,
    wsProtocols: ['binary'],
    trueColor: true,
    localCursor: true,
    width: 1280,
    height: 720,
    onConnect: null,
    onDisconnect: null,
    onCredentialsRequired: null,
    onSecurityFailure: null,
    onClipboard: null,
    onBell: null,
    onDesktopName: null,
    shared: null,
    viewOnly: null,
    focusOnClick: null,
    clipViewport: null,
    dragViewport: null,
    scaleViewport: null,
    resizeSession: null,
    showDotCursor: null,
    background: null,
    qualityLevel: null,
    compressionLevel: null,
  };

  componentDidMount() {
    this.connect();
  }

  componentWillUnmount() {
    this.disconnect();
  }

  componentDidUpdate(prevProps) {
    if (!this.rfb) {
      return;
    }

    passthroughProperties.forEach(propertyName => {
      if (
        propertyName in this.props &&
        this.props[propertyName] != null &&
        this.props[propertyName] !== prevProps[propertyName]
      ) {
        this.rfb[propertyName] = this.props[propertyName];
      }
    });

    if (prevProps.scale !== this.props.scale) {
      this.rfb.get_display().set_scale(this.props.scale || 1);
      this.get_mouse().set_scale(this.props.scale || 1);
    }
  }

  disconnect = () => {
    if (!this.rfb) {
      return;
    }

    this.rfb.disconnect();
    this.rfb = null;
  };

  connect = () => {
    this.disconnect();

    if (!this.canvas) {
      return;
    }

    /* The RFB constructor accepts `shared`, `credentials`, `repeaterID`,
     * and `wsProtocols` as properties on its third argument.
     */

    this.rfb = new RFB(this.canvas, this.props.url, this.props);

    /* These properties are set as properties on the returned RFB object. */

    passthroughProperties.forEach(propertyName => {
      if (propertyName in this.props && this.props[propertyName] != null) {
        this.rfb[propertyName] = this.props[propertyName];
      }
    });

    /* Callback functions are installed as event listeners. */

    Object.entries(events).forEach(([event, propertyName]) => {
      if (propertyName in this.props && this.props[propertyName] != null) {
        this.rfb.addEventListener(event, () => {
          this.props[propertyName]();
        });
      }
    });
  };

  registerChild = ref => {
    this.canvas = ref;
  };

  handleMouseEnter = () => {
    if (!this.rfb) {
      return;
    }

    document.activeElement && document.activeElement.blur();
    this.rfb.focus();
  };

  handleMouseLeave = () => {
    if (!this.rfb) {
      return;
    }

    this.rfb.blur();
  };

  render() {
    return (
      <div
        style={
          this.props.style || {
            width: this.props.width,
            height: this.props.height,
          }
        }
        ref={this.registerChild}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      />
    );
  }
}
