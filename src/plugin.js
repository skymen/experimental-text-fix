const C3 = self.C3;

//<-- PLUGIN_INFO -->

const camelCasedMap = new Map();

function camelCasify(str) {
  // If the string is already camelCased, return it
  if (camelCasedMap.has(str)) {
    return camelCasedMap.get(str);
  }
  // Replace any non-valid JavaScript identifier characters with spaces
  let cleanedStr = str.replace(/[^a-zA-Z0-9$_]/g, " ");

  // Split the string on spaces
  let words = cleanedStr.split(" ").filter(Boolean);

  // Capitalize the first letter of each word except for the first one
  for (let i = 1; i < words.length; i++) {
    words[i] = words[i].charAt(0).toUpperCase() + words[i].substring(1);
  }

  // Join the words back together
  let result = words.join("");

  // If the first character is a number, prepend an underscore
  if (!isNaN(parseInt(result.charAt(0)))) {
    result = "_" + result;
  }

  camelCasedMap.set(str, result);

  return result;
}

const parentClass = {
  object: {
    scripting: self.IInstance,
    instance: C3.SDKInstanceBase,
    plugin: C3.SDKPluginBase,
  },
  world: {
    scripting: self.IWorldInstance,
    instance: C3.SDKWorldInstanceBase,
    plugin: C3.SDKPluginBase,
  },
  dom: {
    scripting: self.IDOMInstance,
    instance: C3.SDKDOMInstanceBase,
    plugin: C3.SDKDOMPluginBase,
  },
};

C3.Plugins[PLUGIN_INFO.id] = class extends (
  parentClass[PLUGIN_INFO.type].plugin
) {
  constructor(opts) {
    if (PLUGIN_INFO.hasDomSide) {
      super(opts, PLUGIN_INFO.id);
    } else {
      super(opts);
    }
  }

  Release() {
    super.Release();
  }
};
const P_C = C3.Plugins[PLUGIN_INFO.id];
P_C.Type = class extends C3.SDKTypeBase {
  constructor(objectClass) {
    super(objectClass);
  }

  Release() {
    super.Release();
  }

  OnCreate() {}
};

//====== SCRIPT INTERFACE ======
const map = new WeakMap();

//<-- SCRIPT_INTERFACE -->

const scriptInterface = getScriptInterface(
  parentClass[PLUGIN_INFO.type].scripting,
  map
);

// extend script interface with plugin actions
Object.keys(PLUGIN_INFO.Acts).forEach((key) => {
  const ace = PLUGIN_INFO.Acts[key];
  if (!ace.autoScriptInterface) return;
  scriptInterface.prototype[camelCasify(key)] = function (...args) {
    const sdkInst = map.get(this);
    P_C.Acts[camelCasify(key)].call(sdkInst, ...args);
  };
});

const addonTriggers = [];

// extend script interface with plugin conditions
Object.keys(PLUGIN_INFO.Cnds).forEach((key) => {
  const ace = PLUGIN_INFO.Cnds[key];
  if (!ace.autoScriptInterface || ace.isStatic || ace.isLooping) return;
  if (ace.isTrigger) {
    scriptInterface.prototype[camelCasify(key)] = function (callback, ...args) {
      const callbackWrapper = () => {
        const sdkInst = map.get(this);
        if (P_C.Cnds[camelCasify(key)].call(sdkInst, ...args)) {
          callback();
        }
      };
      this.addEventListener(key, callbackWrapper, false);
      return () => this.removeEventListener(key, callbackWrapper, false);
    };
  } else {
    scriptInterface.prototype[key] = function (...args) {
      const sdkInst = map.get(this);
      return P_C.Cnds[camelCasify(key)].call(sdkInst, ...args);
    };
  }
});

// extend script interface with plugin expressions
Object.keys(PLUGIN_INFO.Exps).forEach((key) => {
  const ace = PLUGIN_INFO.Exps[key];
  if (!ace.autoScriptInterface) return;
  scriptInterface.prototype[camelCasify(key)] = function (...args) {
    const sdkInst = map.get(this);
    return P_C.Exps[camelCasify(key)].call(sdkInst, ...args);
  };
});
//====== SCRIPT INTERFACE ======

//============ ACES ============
P_C.Acts = {};
P_C.Cnds = {};
P_C.Exps = {};
Object.keys(PLUGIN_INFO.Acts).forEach((key) => {
  const ace = PLUGIN_INFO.Acts[key];
  P_C.Acts[camelCasify(key)] = function (...args) {
    if (ace.forward) ace.forward(this).call(this, ...args);
    else if (ace.handler) ace.handler.call(this, ...args);
  };
});
Object.keys(PLUGIN_INFO.Cnds).forEach((key) => {
  const ace = PLUGIN_INFO.Cnds[key];
  P_C.Cnds[camelCasify(key)] = function (...args) {
    if (ace.forward) return ace.forward(this).call(this, ...args);
    if (ace.handler) return ace.handler.call(this, ...args);
  };
  if (ace.isTrigger && ace.autoScriptInterface) {
    addonTriggers.push({
      method: P_C.Cnds[camelCasify(key)],
      id: key,
    });
  }
});
Object.keys(PLUGIN_INFO.Exps).forEach((key) => {
  const ace = PLUGIN_INFO.Exps[key];
  P_C.Exps[camelCasify(key)] = function (...args) {
    if (ace.forward) return ace.forward(this).call(this, ...args);
    if (ace.handler) return ace.handler.call(this, ...args);
  };
});
//============ ACES ============

//<-- INSTANCE -->

P_C.Instance = getInstanceJs(
  parentClass[PLUGIN_INFO.type].instance,
  scriptInterface,
  addonTriggers,
  C3
);
{
  let oldRenderTextClass = C3.Gfx.RendererText;
  let oldWordWrapClass = C3.WordWrap;
  let oldSpritefontTextClass = self.SpriteFontText;
  let oldTextFragmentClass = C3.TextFragment;
  const kerningOffsetMap = {};
  // const measureMap = {};
  const tempFrag = C3.New(C3.TextFragment, {
    _chArr: [],
    styles: {},
  });

  const EXTRA_LINE_HEIGHT = 4;
  function fillOrStrokeText(ctx, isStroke, text, x, y, maxWidth) {
    if (isStroke)
      if (C3.Platform.BrowserEngine === "Gecko")
        ctx.strokeText(text, x, y, maxWidth);
      else ctx.strokeText(text, x, y);
    else if (C3.Platform.BrowserEngine === "Gecko")
      ctx.fillText(text, x, y, maxWidth);
    else ctx.fillText(text, x, y);
  }
  function fillOrStrokeRect(ctx, isStroke, x, y, w, h) {
    if (isStroke) ctx.strokeRect(x, y, w, h);
    else ctx.fillRect(x, y, w, h);
  }
  function getOffsetParam(paramStr, fragHeight) {
    paramStr = paramStr.trim();
    const param = parseFloat(paramStr);
    if (!isFinite(param)) return 0;
    if (paramStr.endsWith("%")) return (fragHeight * param) / 100;
    else return param;
  }
  function ptToPx(pt) {
    return pt * (4 / 3);
  }
  function IsWordBreakWhiteSpace(ch) {
    if (ch === "\u00a0" || ch === "\u202f") return false;
    else return C3.IsWhitespaceChar(ch);
  }
  function IsNewline(ch) {
    return ch === "\n" || ch === "\r\n";
  }

  let intlSegmenter = null;
  let graphemeSplitter = null;
  if (self["Intl"] && self["Intl"]["Segmenter"])
    intlSegmenter = new self["Intl"]["Segmenter"]();
  else graphemeSplitter = new self.GraphemeSplitter();
  C3.SplitGraphemes = (function () {
    const cache = new Map();

    function splitWithIntlSegmenter(str) {
      return Array.from(intlSegmenter.segment(str), (s) => s.segment);
    }

    function splitWithGraphemeSplitter(str) {
      return graphemeSplitter.splitGraphemes(str);
    }

    const splitterFunction = intlSegmenter
      ? splitWithIntlSegmenter
      : splitWithGraphemeSplitter;

    return function (str) {
      if (cache.has(str)) {
        return cache.get(str);
      } else {
        const result = splitterFunction(str);
        cache.set(str, result);
        return result;
      }
    };
  })();

  if (oldTextFragmentClass) {
    C3.TextFragment = class extends oldTextFragmentClass {
      constructor(...args) {
        super(...args);
      }
      _createKerningKey(renderText, nextFrag) {
        let fontString = renderText._GetFontString(true, this, true);
        let fontString2 = renderText._GetFontString(true, nextFrag, true);
        let lastChar = this._chArr[this._chArr.length - 1];
        let firstNextFragChar = nextFrag._chArr[0];
        return `${fontString}_${lastChar}_${fontString2}_${firstNextFragChar}`;
      }
    };
  }

  if (oldRenderTextClass) {
    C3.Gfx.RendererText = class extends oldRenderTextClass {
      constructor(...args) {
        super(...args);
        this._wrappedText.Clear();
        this._wrappedText = C3.New(C3.WordWrap, this);
      }
      _MeasureText(frag) {
        const text = frag.IsText() ? frag.GetCharacterArray().join("") : " ";
        const fontString = this._GetFontString(true, frag);
        // const key = `${text}_${fontString}`;
        this._SetMeasureFontString(fontString);
        const textMetrics = this._measureContext.measureText(text);
        // if (measureMap[key] !== undefined) {
        //   textMetrics = measureMap[key];
        // } else {
        //   textMetrics = this._measureContext.measureText(text);
        // }
        const sizeStyle = frag.GetStyleTag("size");
        const fontSize =
          (sizeStyle ? parseFloat(sizeStyle.param) : this._fontSize) *
          this._fontSizeScale;
        let topToAlphabeticDistance = 0;
        if (
          this._isBBcodeEnabled &&
          this._SupportsFontBoundingBoxMeasurements()
        ) {
          const textMetricsTop = this._measureContextTop.measureText(text);
          topToAlphabeticDistance =
            textMetrics["fontBoundingBoxAscent"] -
            textMetricsTop["fontBoundingBoxAscent"];
        }
        return {
          width: textMetrics.width,
          height: ptToPx(fontSize),
          fontBoundingBoxAscent: textMetrics["fontBoundingBoxAscent"] || 0,
          fontBoundingBoxDescent: textMetrics["fontBoundingBoxDescent"] || 0,
          topToAlphabeticDistance,
        };
      }
      _skymen_OldDrawTextLine(line, penY, scale) {
        let penX = 0;
        if (this._horizontalAlign === "center")
          penX = (this._width - line.GetWidth() * scale) / 2;
        else if (this._horizontalAlign === "right")
          penX = this._width - line.GetWidth() * scale;

        //ASHLEY HERE: fix for kerning
        //VVVVVVVVVVV

        let lastfrag = null;
        let totOffset = 0;
        const offsetArr = [];
        let key = "text";
        if (
          line.fragments &&
          line.fragments[0] &&
          line.fragments[0].text === undefined
        ) {
          key = "chArr";
        }

        for (const frag of line.fragments) {
          if (lastfrag) {
            if (
              !this._HasStyleTag(lastfrag.styles, "size") &&
              !this._HasStyleTag(frag.styles, "size")
            ) {
              const addSeparate =
                this._MeasureText(lastfrag[key], lastfrag.styles).width +
                this._MeasureText(frag[key], frag.styles).width;
              let addTogether;
              if (key === "text") {
                addTogether = this._MeasureText(
                  lastfrag.text + frag.text,
                  frag.styles
                ).width;
              } else {
                addTogether = this._MeasureText(
                  [...lastfrag.chArr, ...frag.chArr],
                  frag.styles
                ).width;
              }
              let offset = addTogether - addSeparate;
              totOffset += offset;
              offsetArr.push(offset);
            }
          }
          lastfrag = frag;
        }
        if (this._horizontalAlign === "center") penX -= (scale * totOffset) / 2;
        else if (this._horizontalAlign === "right") penX -= scale * totOffset;
        lastfrag = null;

        //^^^^^^^^^^^
        //ASHLEY HERE: fix for kerning

        for (const frag of line.fragments) {
          //ASHLEY HERE: fix for kerning
          //VVVVVVVVVVV

          let offset = 0;
          if (lastfrag && offsetArr.length > 0) {
            offset = offsetArr.shift();
          }
          penX += scale * offset;

          //^^^^^^^^^^^
          //ASHLEY HERE: fix for kerning

          this._DrawTextFragment(frag, penX, penY, scale, line.height);
          penX += frag.width * scale;

          //ASHLEY HERE: fix for kerning
          //VVVVVVVVVVV

          lastfrag = frag;

          //^^^^^^^^^^^
          //ASHLEY HERE: fix for kerning
        }
      }

      _DrawTextLine(line, penY, scale) {
        if (!line.SetPosX)
          return this._skymen_OldDrawTextLine(line, penY, scale);
        let penX = 0;
        if (this._horizontalAlign === "center")
          penX = (this._width - line.GetWidth() * scale) / 2;
        else if (this._horizontalAlign === "right")
          penX = this._width - line.GetWidth() * scale;
        line.SetPosX(penX);
        line.SetPosY(penY);

        //ASHLEY HERE: fix for kerning
        //VVVVVVVVVVV

        let lastfrag = null;
        let totOffset = 0;
        const offsetArr = [];

        for (const frag of line.fragments()) {
          if (lastfrag) {
            if (this._skymen_CanBeKerned(lastfrag, frag)) {
              let offset = 0;
              let key = lastfrag._createKerningKey(this, frag);
              // if (kerningOffsetMap[key] !== undefined) {
              offset = kerningOffsetMap[key];
              // } else {
              //   tempFrag.styles = frag.styles;
              //   tempFrag._chArr = [frag._chArr[0]];
              //   let addSeparate = this._MeasureText(tempFrag).width;
              //   tempFrag._chArr = [lastfrag._chArr[lastfrag._chArr.length - 1]];
              //   addSeparate += this._MeasureText(tempFrag).width;
              //   tempFrag._chArr = [
              //     lastfrag._chArr[lastfrag._chArr.length - 1],
              //     frag._chArr[0],
              //   ];
              //   let addTogether = this._MeasureText(tempFrag).width;
              //   offset = addTogether - addSeparate;
              //   kerningOffsetMap[key] = offset;
              // }
              totOffset += offset;
              offsetArr.push(offset);
            }
          }
          lastfrag = frag;
        }

        if (this._horizontalAlign === "center") penX -= (scale * totOffset) / 2;
        else if (this._horizontalAlign === "right") penX -= scale * totOffset;
        lastfrag = null;
        line.SetPosX(penX);
        line.SetPosY(penY);

        //^^^^^^^^^^^
        //ASHLEY HERE: fix for kerning

        for (const frag of line.fragments()) {
          //ASHLEY HERE: fix for kerning
          //VVVVVVVVVVV

          let offset = 0;
          if (lastfrag && offsetArr.length > 0) {
            offset = offsetArr.shift();
          }
          penX += scale * offset;

          //^^^^^^^^^^^
          //ASHLEY HERE: fix for kerning

          this._DrawFragment(frag, penX, penY, scale, line.GetHeight());
          penX += frag.GetWidth() * scale;

          //ASHLEY HERE: fix for kerning
          //VVVVVVVVVVV

          lastfrag = frag;

          //^^^^^^^^^^^
          //ASHLEY HERE: fix for kerning
        }
      }
      _DrawTextFragment(frag, penX, penY, scale, lineHeight) {
        const textContext = this._textContext;
        const lineFontScale = lineHeight / 16;
        let fragWidth = frag.width * scale;
        const fragHeight = frag.height * scale;
        const fragFontScale = frag.height / 16;
        const lineSpaceHeight = (EXTRA_LINE_HEIGHT + this._lineHeight) * scale;
        const styles = frag.styles;
        let text = frag.text === undefined ? frag.chArr : frag.text.split("");
        if (this._drawMaxCharCount !== -1) {
          if (this._drawCharCount >= this._drawMaxCharCount) return;
          if (this._drawCharCount + text.length > this._drawMaxCharCount) {
            text = text.slice(0, this._drawMaxCharCount - this._drawCharCount);
            fragWidth = this._MeasureText(text, styles).width * scale;
          }
          this._drawCharCount += text.length;
        }
        const backgroundStyle = this._GetStyleTag(styles, "background");
        const hasUnderline = this._HasStyleTag(styles, "u");
        const hasStrikethrough = this._HasStyleTag(styles, "s");
        if (
          (((C3.IsCharArrayAllWhitespace &&
            C3.IsCharArrayAllWhitespace(text)) ||
            C3.IsStringAllWhitespace(text.join(""))) &&
            !backgroundStyle &&
            !hasUnderline &&
            !hasStrikethrough) ||
          this._HasStyleTag(styles, "hide")
        )
          return;
        text = text.join("");
        const offsetXStyle = this._GetStyleTag(styles, "offsetx");
        penX += offsetXStyle ? parseFloat(offsetXStyle.param) * scale : 0;
        const offsetYStyle = this._GetStyleTag(styles, "offsety");
        penY += offsetYStyle ? parseFloat(offsetYStyle.param) * scale : 0;

        //ASHLEY HERE: Angle tag
        //VVVVVVVVVVV

        const angleStyle = this._GetStyleTag(styles, "angle");
        const angle = angleStyle
          ? (parseFloat(angleStyle.param) * Math.PI) / 180
          : 0;
        textContext.translate(penX, penY);
        textContext.rotate(angle);
        textContext.translate(-penX, -penY);

        //^^^^^^^^^^^
        //ASHLEY HERE: Angle tag

        if (backgroundStyle) {
          this._SetDrawCanvasColor(backgroundStyle.param);
          textContext.fillRect(
            penX,
            penY - fragHeight,
            fragWidth,
            fragHeight + lineSpaceHeight
          );
        }
        const colorStyle = this._GetStyleTag(styles, "color");
        this._SetDrawCanvasColor(
          colorStyle ? colorStyle.param : this._colorStr
        );
        const opacityStyle = this._GetStyleTag(styles, "opacity");
        this._SetDrawCanvasOpacity(
          opacityStyle ? parseFloat(opacityStyle.param) / 100 : 1
        );
        const lineThicknessStyle = this._GetStyleTag(styles, "linethickness");
        const lineThicknessScale = lineThicknessStyle
          ? parseFloat(lineThicknessStyle.param)
          : 1;
        const isStroke = this._HasStyleTag(styles, "stroke");
        if (isStroke)
          this._SetDrawCanvasLineWith(
            fragFontScale *
              0.5 *
              lineThicknessScale *
              this._scaleFactor *
              this._zoom *
              self.devicePixelRatio
          );
        this._SetDrawFontString(this._GetFontString(false, styles));
        if (!isStroke) {
          this._SetDrawCanvasLineWith(
            fragFontScale *
              1 *
              lineThicknessScale *
              this._scaleFactor *
              this._zoom *
              self.devicePixelRatio
          );
          const outlineStyle = this._GetStyleTag(styles, "outline");
          if (outlineStyle) {
            this._SetDrawCanvasColor(outlineStyle.param);
            fillOrStrokeText(textContext, true, text, penX, penY, fragWidth);
          }

          this._SetDrawCanvasLineWith(
            fragFontScale *
              0.5 *
              lineThicknessScale *
              this._scaleFactor *
              this._zoom *
              self.devicePixelRatio
          );
        }
        this._SetDrawCanvasColor(
          colorStyle ? colorStyle.param : this._colorStr
        );
        if (hasUnderline)
          fillOrStrokeRect(
            textContext,
            isStroke,
            penX,
            penY + scale * lineFontScale,
            fragWidth,
            scale * lineFontScale * lineThicknessScale
          );
        if (hasStrikethrough) {
          const defaultStrikeY = penY - fragHeight / 4;
          const defaultStrikeHeight = scale * fragFontScale;
          const strikeYMid = defaultStrikeY + defaultStrikeHeight / 2;
          textContext.fillRect(
            penX,
            strikeYMid - (defaultStrikeHeight * lineThicknessScale) / 2,
            fragWidth,
            defaultStrikeHeight * lineThicknessScale
          );
        }

        this._SetDrawFontString(this._GetFontString(false, styles));
        fillOrStrokeText(textContext, isStroke, text, penX, penY, fragWidth);

        //ASHLEY HERE: Angle tag
        //VVVVVVVVVVV

        textContext.translate(penX, penY);
        textContext.rotate(-angle);
        textContext.translate(-penX, -penY);

        //^^^^^^^^^^^
        //ASHLEY HERE: Angle tag
      }
      _DrawFragment(frag, penX, penY, scale, lineHeight) {
        const offsetXStyle = frag.GetStyleTag("offsetx");
        penX += offsetXStyle
          ? getOffsetParam(offsetXStyle.param, frag.GetHeight()) * scale
          : 0;
        const offsetYStyle = frag.GetStyleTag("offsety");
        penY += offsetYStyle
          ? getOffsetParam(offsetYStyle.param, frag.GetHeight()) * scale
          : 0;
        if (frag.IsIcon()) {
          const iconOffsetYStyle = frag.GetStyleTag("iconoffsety");
          penY += iconOffsetYStyle
            ? getOffsetParam(iconOffsetYStyle.param, frag.GetHeight()) * scale
            : 0.2 * frag.GetHeight() * scale;
        }
        frag.SetPosX(penX);
        frag.SetPosY(penY);
        const textContext = this._textContext;
        const lineFontScale = lineHeight / 16;
        let fragWidth = frag.GetWidth() * scale;
        const fragHeight = frag.GetHeight() * scale;
        const fragFontScale = frag.GetHeight() / 16;
        const lineSpaceHeight = (EXTRA_LINE_HEIGHT + this._lineHeight) * scale;
        let chArr = frag.IsText() ? frag.GetCharacterArray() : null;
        if (this._drawMaxCharCount !== -1) {
          if (this._drawCharCount >= this._drawMaxCharCount) return;
          if (frag.IsText())
            if (this._drawCharCount + chArr.length > this._drawMaxCharCount) {
              chArr = chArr.slice(
                0,
                this._drawMaxCharCount - this._drawCharCount
              );
              fragWidth = this._MeasureText(frag).width * scale;
            }
          this._drawCharCount += frag.GetLength();
        }
        const backgroundStyle = frag.GetStyleTag("background");
        const hasUnderline = frag.HasStyleTag("u");
        const hasStrikethrough = frag.HasStyleTag("s");
        if (
          (frag.IsText() &&
            C3.IsCharArrayAllWhitespace(chArr) &&
            !backgroundStyle &&
            !hasUnderline &&
            !hasStrikethrough) ||
          frag.HasStyleTag("hide")
        )
          return;

        //ASHLEY HERE: Angle tag
        //VVVVVVVVVVV
        const angleStyle = frag.GetStyleTag("angle");
        const angle = angleStyle
          ? (parseFloat(angleStyle.param) * Math.PI) / 180
          : 0;
        textContext.translate(penX, penY);
        textContext.rotate(angle);
        textContext.translate(-penX, -penY);
        //^^^^^^^^^^^
        //ASHLEY HERE: Angle tag

        if (backgroundStyle) {
          this._SetDrawCanvasColor(backgroundStyle.param);
          textContext.fillRect(
            penX,
            penY - fragHeight,
            fragWidth,
            fragHeight + lineSpaceHeight
          );
        }
        const colorStyle = frag.GetStyleTag("color");
        this._SetDrawCanvasColor(
          colorStyle ? colorStyle.param : this._colorStr
        );
        const opacityStyle = frag.GetStyleTag("opacity");
        this._SetDrawCanvasOpacity(
          opacityStyle ? parseFloat(opacityStyle.param) / 100 : 1
        );
        const lineThicknessStyle = frag.GetStyleTag("linethickness");
        const lineThicknessScale = lineThicknessStyle
          ? parseFloat(lineThicknessStyle.param)
          : 1;
        const isStroke = frag.HasStyleTag("stroke");
        if (isStroke)
          this._SetDrawCanvasLineWith(
            fragFontScale * 0.5 * lineThicknessScale * this.GetDrawScale()
          );
        if (frag.IsText()) {
          const text = chArr.join("");
          this._SetDrawFontString(this._GetFontString(false, frag));
          if (!isStroke) {
            this._SetDrawCanvasLineWith(
              fragFontScale * 1 * lineThicknessScale * this.GetDrawScale()
            );
            const outlineStyle = frag.GetStyleTag("outline");
            if (outlineStyle) {
              let lastColor = this._lastTextCanvasFillStyle;
              this._SetDrawCanvasColor(outlineStyle.param);
              fillOrStrokeText(textContext, true, text, penX, penY, fragWidth);
              this._SetDrawCanvasColor(lastColor);
            }
          }
          this._SetDrawCanvasLineWith(
            fragFontScale * 0.5 * lineThicknessScale * this.GetDrawScale()
          );
          fillOrStrokeText(textContext, isStroke, text, penX, penY, fragWidth);
        } else if (frag.IsIcon())
          if (frag.GetWidth() > 0) {
            const drawable = frag.GetDrawable(this._iconSet);
            if (drawable)
              textContext.drawImage(
                drawable,
                penX,
                penY - fragHeight,
                fragWidth,
                fragHeight
              );
          }
        this._SetDrawCanvasColor(
          colorStyle ? colorStyle.param : this._colorStr
        );
        if (hasUnderline)
          fillOrStrokeRect(
            textContext,
            isStroke,
            penX,
            penY + scale * lineFontScale,
            fragWidth,
            scale * lineFontScale * lineThicknessScale
          );
        if (hasStrikethrough) {
          const defaultStrikeY = penY - fragHeight / 4;
          const defaultStrikeHeight = scale * fragFontScale;
          const strikeYMid = defaultStrikeY + defaultStrikeHeight / 2;
          textContext.fillRect(
            penX,
            strikeYMid - (defaultStrikeHeight * lineThicknessScale) / 2,
            fragWidth,
            defaultStrikeHeight * lineThicknessScale
          );
        }
        //ASHLEY HERE: Angle tag
        //VVVVVVVVVVV
        textContext.translate(penX, penY);
        textContext.rotate(-angle);
        textContext.translate(-penX, -penY);
        //^^^^^^^^^^^
        //ASHLEY HERE: Angle tag
      }

      _skymen_CanBeKerned(frag, nextFrag) {
        if (
          !frag ||
          frag._chArr.length === 0 ||
          !nextFrag ||
          !frag.IsText() ||
          !nextFrag.IsText() ||
          nextFrag._chArr.length === 0
        )
          return false;

        // if (
        //   this._GetFontString(true, frag) !==
        //   this._GetFontString(true, nextFrag)
        // ) {
        //   console.log(
        //     frag._chArr[frag._chArr.length - 1],
        //     nextFrag._chArr[0],
        //     this._GetFontString(true, frag),
        //     this._GetFontString(true, nextFrag)
        //   );
        //   return false;
        // }
        return true;

        // return (
        //   this._GetFontString(true, frag) ===
        //   this._GetFontString(true, nextFrag)
        // );
      }

      _GetFontString(useCssUnits, frag, skymen = false) {
        if (skymen && frag._skymenFontString) return frag._skymenFontString;
        let fontString = super._GetFontString(useCssUnits, frag);
        if (skymen) frag._skymenFontString = fontString;
        return fontString;
      }
    };
  }

  if (oldWordWrapClass) {
    C3.WordWrap = class extends oldWordWrapClass {
      constructor(inst) {
        super();
        this._isText = inst && inst instanceof C3.Gfx.RendererText;
        this._renderText = inst;
      }

      _MeasureLine(line, measureFunc) {
        let width = 0;
        let height = 0;
        let fbbAscent = 0;
        let fbbDescent = 0;
        let topToAlphabeticDistance = 0;
        let i = 0;
        for (const frag of line) {
          let nextFrag = i < line.length - 1 ? line[i + 1] : null;
          if (frag.GetWidth() === -1) {
            const m = measureFunc(frag);
            frag.SetHeight(m.height);
            frag.SetFontBoundingBoxAscent(m.fontBoundingBoxAscent || 0);
            frag.SetFontBoundingBoxDescent(m.fontBoundingBoxDescent || 0);
            frag.SetTopToAlphabeticDistance(m.topToAlphabeticDistance || 0);
            if (frag.IsText()) frag.SetWidth(m.width);
            else if (frag.IsIcon())
              frag.CalculateWidthFromHeight(this._iconSet);
          }

          let offset = 0;
          if (
            this._isText &&
            this._renderText._skymen_CanBeKerned(frag, nextFrag)
          ) {
            let key = frag._createKerningKey(this._renderText, nextFrag);
            if (kerningOffsetMap[key] !== undefined) {
              offset = kerningOffsetMap[key];
            } else {
              tempFrag.styles = nextFrag.styles;
              tempFrag._chArr = [nextFrag._chArr[0]];
              let addSeparate = measureFunc(tempFrag).width;
              tempFrag._chArr = [frag._chArr[frag._chArr.length - 1]];
              addSeparate += measureFunc(tempFrag).width;
              tempFrag._chArr = [
                frag._chArr[frag._chArr.length - 1],
                nextFrag._chArr[0],
              ];
              let addTogether = measureFunc(tempFrag).width;
              offset = addTogether - addSeparate;
              kerningOffsetMap[key] = offset;
            }
          }
          width += frag.GetWidth() + offset;
          height = Math.max(height, frag.GetHeight());
          fbbAscent = Math.max(fbbAscent, frag.GetFontBoundingBoxAscent());
          fbbDescent = Math.max(fbbDescent, frag.GetFontBoundingBoxDescent());
          topToAlphabeticDistance = Math.max(
            topToAlphabeticDistance,
            frag.GetTopToAlphabeticDistance()
          );
          i++;
        }
        return {
          width,
          height,
          fontBoundingBoxAscent: fbbAscent,
          fontBoundingBoxDescent: fbbDescent,
          topToAlphabeticDistance,
        };
      }

      _GetOrMeasureKerningOffset(frag, nextFrag, measureFunc) {
        const key = frag._createKerningKey(this._renderText, nextFrag);
        if (kerningOffsetMap[key] !== undefined) {
          return kerningOffsetMap[key];
        }
        tempFrag.styles = nextFrag.styles;
        tempFrag._chArr = [nextFrag._chArr[0]];
        let addSeparate = measureFunc(tempFrag).width;
        tempFrag._chArr = [frag._chArr[frag._chArr.length - 1]];
        addSeparate += measureFunc(tempFrag).width;
        tempFrag._chArr = [
          frag._chArr[frag._chArr.length - 1],
          nextFrag._chArr[0],
        ];
        let addTogether = measureFunc(tempFrag).width;
        const offset = addTogether - addSeparate;
        kerningOffsetMap[key] = offset;
        return offset;
      }

      _WrapText(tokenisedFragments, measureFunc, wrapWidth, endOfLineMargin) {
        let currentLine = [];
        let currentLineWidth = 0;
        let currentLineHeight = 0;
        let currentLineFbbAscent = 0;
        let currentLineFbbDescent = 0;
        let currentLineTopToAlphabetic = 0;
        for (const curWord of tokenisedFragments) {
          if (
            curWord.length === 1 &&
            curWord[0].IsText() &&
            curWord[0].GetLength() === 1 &&
            IsNewline(curWord[0].GetCharacterArray()[0])
          ) {
            if (currentLineHeight === 0) {
              const tempFrag = C3.New(C3.TextFragment, {
                chArr: [" "],
                styles: curWord[0].GetStyles(),
              });
              const m = measureFunc(tempFrag);
              currentLineHeight = m.height;
              currentLineFbbAscent = m.fontBoundingBoxAscent || 0;
              currentLineFbbDescent = m.fontBoundingBoxDescent || 0;
              currentLineTopToAlphabetic = m.topToAlphabeticDistance || 0;
            }
            this._AddLine(
              currentLine,
              currentLineWidth,
              currentLineHeight,
              currentLineFbbAscent,
              currentLineFbbDescent,
              currentLineTopToAlphabetic
            );
            currentLine = [];
            currentLineWidth = 0;
            currentLineHeight = 0;
            currentLineFbbAscent = 0;
            currentLineFbbDescent = 0;
            currentLineTopToAlphabetic = 0;
            continue;
          }
          // const tryLine = this._CopyLine(currentLine);
          // this._AddWordToLine(tryLine, curWord);
          const tryMetrics = this._MeasureLine(curWord, measureFunc);
          const kerningOffset =
            this._isText &&
            this._renderText._skymen_CanBeKerned(
              currentLine[currentLine.length - 1],
              curWord[0]
            )
              ? this._GetOrMeasureKerningOffset(
                  currentLine[currentLine.length - 1],
                  curWord[0],
                  measureFunc
                )
              : 0;
          const tryLineWidth =
            currentLineWidth + tryMetrics.width + kerningOffset;
          if (tryLineWidth >= wrapWidth) {
            if (currentLine.length > 0)
              this._AddLine(
                currentLine,
                currentLineWidth,
                currentLineHeight,
                currentLineFbbAscent,
                currentLineFbbDescent,
                currentLineTopToAlphabetic
              );
            currentLine = [];
            if (
              curWord[0].IsText() &&
              C3.IsCharArrayAllWhitespace(curWord[0].GetCharacterArray())
            ) {
              currentLineWidth = 0;
              currentLineHeight = 0;
              currentLineFbbAscent = 0;
              currentLineFbbDescent = 0;
              currentLineTopToAlphabetic = 0;
            } else {
              this._AddWordToLine(currentLine, curWord);
              const metrics = this._MeasureLine(currentLine, measureFunc);
              currentLineWidth = metrics.width;
              currentLineHeight = metrics.height;
              currentLineFbbAscent = metrics.fontBoundingBoxAscent;
              currentLineFbbDescent = metrics.fontBoundingBoxDescent;
              currentLineTopToAlphabetic = metrics.topToAlphabeticDistance;
            }
          } else {
            this._AddWordToLine(currentLine, curWord);
            // currentLine = tryLine;
            currentLineWidth = tryLineWidth;
            currentLineHeight = Math.max(tryMetrics.height, currentLineHeight);
            currentLineFbbAscent = Math.max(
              currentLineFbbAscent,
              tryMetrics.fontBoundingBoxAscent
            );
            currentLineFbbDescent = Math.max(
              currentLineFbbDescent,
              tryMetrics.fontBoundingBoxDescent
            );
            currentLineTopToAlphabetic =
              currentLineFbbAscent - currentLineFbbDescent;
          }
        }
        if (currentLine.length > 0)
          this._AddLine(
            currentLine,
            currentLineWidth,
            currentLineHeight,
            currentLineFbbAscent,
            currentLineFbbDescent,
            currentLineTopToAlphabetic
          );
        this._TrimLinesTrailingWhitespace(measureFunc, endOfLineMargin);
      }
    };
  }

  if (oldSpritefontTextClass) {
    self.SpriteFontText = class extends oldSpritefontTextClass {
      constructor(...args) {
        super(...args);
        this._wrappedText.Clear();
        this._wrappedText = C3.New(C3.WordWrap, this);
      }
    };
  }
}
