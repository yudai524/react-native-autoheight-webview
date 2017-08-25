'use strict'

import React, {
  Component,
  PropTypes
} from 'react';

import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  WebView
} from 'react-native';

import ImmutableComponent from 'react-immutable-component';

export default class AutoHeightWebView extends ImmutableComponent {
  constructor(props) {
    super(props);
    this.handleNavigationStateChange = this.handleNavigationStateChange.bind(this);
    if (this.props.enableAnimation) {
      this.opacityAnimatedValue = new Animated.Value(0);
    }
    const initialScript = props.files ? this.appendFilesToHead(props.files, BaseScript) : BaseScript;
    this.state = {
      height: 0,
      script: initialScript
    };
  }

  componentWillReceiveProps(nextProps) {
    let currentScript = BaseScript;
    if (nextProps.files) {
      currentScript = this.appendFilesToHead(nextProps.files, BaseScript);
    }
    this.setState({ script: currentScript });
  }

  appendFilesToHead(files, script) {
    if (!files) {
      return script;
    }
    for (let file of files) {
      script =
        `
                var link  = document.createElement('link');
                link.rel  = '` + file.rel + `';
                link.type = '` + file.type + `';
                link.href = '` + file.href + `';
                document.head.appendChild(link);
                ` + script;
    }
    return script;
  }

  onHeightUpdated(height) {
    if (this.props.onHeightUpdated) {
      this.props.onHeightUpdated(height);
    }
  }

  handleNavigationStateChange(navState) {
    const height = Number(navState.title);
    if (height) {
      if (this.props.enableAnimation) {
        this.opacityAnimatedValue.setValue(0);
      }
      this.setState({ height }, () => {
        if (this.props.enableAnimation) {
          Animated.timing(this.opacityAnimatedValue, {
            toValue: 1,
            duration: this.props.animationDuration
          }).start(() => this.onHeightUpdated(height));
        }
        else {
          this.onHeightUpdated(height);
        }
      });
    }
  }

  render() {
    const { height, script } = this.state;
    const { enableAnimation, source, heightOffset, customScript, style } = this.props;
    const webViewSource = Object.assign({}, source, { baseUrl: 'web/' });
    return (
      <Animated.View style={[Styles.container, {
        opacity: enableAnimation ? this.opacityAnimatedValue : 1,
        height: height + heightOffset,
      }, style]}>
        <WebView
          style={Styles.webView}
          injectedJavaScript={script + customScript}
          scrollEnabled={false}
          source={webViewSource}
          onNavigationStateChange={this.handleNavigationStateChange}/>
      </Animated.View>
    );
  }
}

AutoHeightWebView.propTypes = {
  source: WebView.propTypes.source,
  onHeightUpdated: PropTypes.func,
  customScript: PropTypes.string,
  enableAnimation: PropTypes.bool,
  // only works on enable animation
  animationDuration: PropTypes.number,
  // offset of rn webview margin
  heightOffset: PropTypes.number,
  style: View.propTypes.style,
  // add web/files... to project root
  files: PropTypes.arrayOf(PropTypes.shape({
    href: PropTypes.string,
    type: PropTypes.string,
    rel: PropTypes.string
  }))
}

AutoHeightWebView.defaultProps = {
  enableAnimation: true,
  animationDuration: 555,
  heightOffset: 12
}

const ScreenWidth = Dimensions.get('window').width;

const Styles = StyleSheet.create({
  container: {
    width: ScreenWidth,
    backgroundColor: 'transparent'
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent'
  }
});

// note that it can not get height when there are only text objects in a html body which does not make any sense
const BaseScript =
  `
    ; (function () {
        var i = 0;
        
        // append calculator to body
        var calculator = document.createElement("div");
        calculator.id = "height-calculator";
        while (document.body.firstChild) {
            calculator.appendChild(document.body.firstChild);
        }
        document.body.appendChild(calculator);
        
        // append style to get exact height to body
        var style = document.createElement("style");
        style.type = "text/css";
        document.getElementsByTagName('head').item(0).appendChild(style);
        var styleSheets = document.styleSheets.item(document.styleSheets.length - 1);
        styleSheets.insertRule("#height-calculator {position: absolute;top: 0;left: 0;right: 0;}", 0);
        styleSheets.insertRule("body, html, #height-calculator {margin: 0;padding: 0;}", 0);
        
        function updateHeight() {
            window.location.hash = ++i;
            document.title = calculator.clientHeight;
        }
        updateHeight();
        window.addEventListener('load', updateHeight);
        window.addEventListener('resize', updateHeight);
    } ());
    `;