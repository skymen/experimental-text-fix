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

// ANGLES TAG
if (true) {
  /** FIXES BEING DONE HERE
   * Adds an angle BBCode tag to the text renderer
   * */
  const C3 = self.C3;
  let oldRenderTextClass = C3.Gfx.RendererText;
  if (oldRenderTextClass) {
    const EXTRA_LINE_HEIGHT = 4;
    function fillOrStrokeRect(ctx, isStroke, x, y, w, h) {
      if (isStroke) ctx.strokeRect(x, y, w, h);
      else ctx.fillRect(x, y, w, h);
    }
    C3.Gfx.RendererText = class RendererText extends oldRenderTextClass {
      _DrawFragment(frag, scale, lineHeight) {
        const textContext = this._textContext;
        const penX = frag.GetPosX();
        const penY = frag.GetPosY();
        if (!Number.isFinite(penX) || !Number.isFinite(penY)) return;
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
              fragFontScale * 0.5 * lineThicknessScale * this.GetDrawScale()
            );
            const outlineBackStyle = frag.GetStyleTag("outlineback");
            if (outlineBackStyle) {
              this._SetDrawCanvasColor(outlineBackStyle.param);
              this._FillOrStrokeText(true, text, penX, penY, fragWidth);
            }
          }
          this._SetDrawCanvasColor(
            colorStyle ? colorStyle.param : this._colorStr
          );
          this._FillOrStrokeText(isStroke, text, penX, penY, fragWidth);
          if (!isStroke) {
            this._SetDrawCanvasLineWith(
              fragFontScale * 0.5 * lineThicknessScale * this.GetDrawScale()
            );
            const outlineStyle = frag.GetStyleTag("outline");
            if (outlineStyle) {
              this._SetDrawCanvasColor(outlineStyle.param);
              this._FillOrStrokeText(true, text, penX, penY, fragWidth);
            }
          }
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
    };
  }
}

// KERNING FIX
if (true) {
  /** FIXES BEING DONE HERE
   * Optimise measureText calls by caching the result of kerning values and instead measuring individual fragments
   * Change text rendering to use the cached kerning values
   * */
  const C3 = self.C3;
  let oldRenderTextClass = C3.Gfx.RendererText;
  let oldWordWrapClass = C3.WordWrap;
  let oldSpritefontTextClass = self.SpriteFontText;
  const kerningOffsetMap = {};
  const tempFrag = C3.New(C3.TextFragment, {
    _chArr: [],
    styles: {},
  });
  function IsNewline(ch) {
    return ch === "\n" || ch === "\r\n";
  }

  if (oldWordWrapClass) {
    C3.WordWrap = class extends oldWordWrapClass {
      constructor(inst) {
        super();
        this._isText = inst && inst instanceof C3.Gfx.RendererText;
        this._renderText = inst;
      }

      _skymen_GetOrMeasureKerningOffset(frag, nextFrag, measureFunc) {
        const key = this._renderText._skymen_CreateKerningKey(frag, nextFrag);
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

      _MeasureLine(line, measureFunc) {
        let width = 0;
        let height = 0;
        let fbbAscent = 0;
        let fbbDescent = 0;
        let topToAlphabeticDistance = 0;

        //ASHLEY HERE: fix for kerning
        //VVVVVVVVVVV
        let i = 0;
        //^^^^^^^^^^^
        //ASHLEY HERE: fix for kerning
        for (const frag of line) {
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

          //ASHLEY HERE: fix for kerning
          //VVVVVVVVVVV
          let nextFrag = i < line.length - 1 ? line[i + 1] : null;
          i++;
          width +=
            this._isText && this._renderText._skymen_CanBeKerned(frag, nextFrag)
              ? this._skymen_GetOrMeasureKerningOffset(
                  frag,
                  nextFrag,
                  measureFunc
                )
              : 0;
          //^^^^^^^^^^^
          //ASHLEY HERE: fix for kerning

          width += frag.GetWidth();
          height = Math.max(height, frag.GetHeight());
          fbbAscent = Math.max(fbbAscent, frag.GetFontBoundingBoxAscent());
          fbbDescent = Math.max(fbbDescent, frag.GetFontBoundingBoxDescent());
          topToAlphabeticDistance = Math.max(
            topToAlphabeticDistance,
            frag.GetTopToAlphabeticDistance()
          );
        }
        return {
          width,
          height,
          fontBoundingBoxAscent: fbbAscent,
          fontBoundingBoxDescent: fbbDescent,
          topToAlphabeticDistance,
        };
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
            //ASHLEY HERE: fix for kerning
            //VVVVVVVVVVV
            else {
              const metrics = this._MeasureLine(currentLine, measureFunc);
              currentLineWidth = metrics.width;
              currentLineHeight = metrics.height;
              currentLineFbbAscent = metrics.fontBoundingBoxAscent;
              currentLineFbbDescent = metrics.fontBoundingBoxDescent;
              currentLineTopToAlphabetic = metrics.topToAlphabeticDistance;
            }
            //^^^^^^^^^^^
            //ASHLEY HERE: fix for kerning
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
          //ASHLEY HERE: fix for kerning
          //VVVVVVVVVVV
          const tryMetrics = this._MeasureLine(curWord, measureFunc);
          const kerningOffset =
            this._isText &&
            this._renderText._skymen_CanBeKerned(
              currentLine[currentLine.length - 1],
              curWord[0]
            )
              ? this._skymen_GetOrMeasureKerningOffset(
                  currentLine[currentLine.length - 1],
                  curWord[0],
                  measureFunc
                )
              : 0;
          const tryLineWidth =
            currentLineWidth + tryMetrics.width + kerningOffset;
          if (tryLineWidth >= wrapWidth) {
            if (currentLine.length > 0) {
              const metrics = this._MeasureLine(currentLine, measureFunc);
              currentLineWidth = metrics.width;
              currentLineHeight = metrics.height;
              currentLineFbbAscent = metrics.fontBoundingBoxAscent;
              currentLineFbbDescent = metrics.fontBoundingBoxDescent;
              currentLineTopToAlphabetic = metrics.topToAlphabeticDistance;
              this._AddLine(
                currentLine,
                currentLineWidth,
                currentLineHeight,
                currentLineFbbAscent,
                currentLineFbbDescent,
                currentLineTopToAlphabetic
              );
            }
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
        if (currentLine.length > 0) {
          const metrics = this._MeasureLine(currentLine, measureFunc);
          currentLineWidth = metrics.width;
          currentLineHeight = metrics.height;
          currentLineFbbAscent = metrics.fontBoundingBoxAscent;
          currentLineFbbDescent = metrics.fontBoundingBoxDescent;
          currentLineTopToAlphabetic = metrics.topToAlphabeticDistance;
          //^^^^^^^^^^^
          //ASHLEY HERE: fix for kerning
          this._AddLine(
            currentLine,
            currentLineWidth,
            currentLineHeight,
            currentLineFbbAscent,
            currentLineFbbDescent,
            currentLineTopToAlphabetic
          );
        }
        this._TrimLinesTrailingWhitespace(measureFunc, endOfLineMargin);
      }
    };
  }

  if (oldSpritefontTextClass) {
    /** FIXES BEING DONE HERE
     * Makes sure the spritefont text object uses the new word wrap class
     * Since the WordWrap class is shared between SpriteFontText and RendererText
     * this lets me disable the fix for SpriteFontText
     * */
    self.SpriteFontText = class extends oldSpritefontTextClass {
      constructor(...args) {
        super(...args);
        this._wrappedText.Clear();
        this._wrappedText = C3.New(C3.WordWrap, this);
      }
    };
  }

  if (oldRenderTextClass) {
    /** FIXES BEING DONE HERE
     * Adds util functions and implements kerning for frag positioning
     * */
    C3.Gfx.RendererText = class extends oldRenderTextClass {
      constructor(...args) {
        super(...args);
        this._wrappedText.Clear();
        this._wrappedText = C3.New(C3.WordWrap, this);
      }
      _LayoutTextLine(line, penY, scale) {
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

        for (const frag of this._textDirection === "ltr"
          ? line.fragments()
          : line.fragmentsReverse()) {
          if (lastfrag) {
            if (this._skymen_CanBeKerned(lastfrag, frag)) {
              let offset = 0;
              let key = this._skymen_CreateKerningKey(lastfrag, frag);
              offset = kerningOffsetMap[key];
              if (!offset) offset = 0;
              totOffset += offset;
              offsetArr.push(offset);
            } else {
              offsetArr.push(0);
            }
          }
          lastfrag = frag;
        }

        lastfrag = null;
        //^^^^^^^^^^^
        //ASHLEY HERE: fix for kerning
        for (const frag of this._textDirection === "ltr"
          ? line.fragments()
          : line.fragmentsReverse()) {
          //ASHLEY HERE: fix for kerning
          //VVVVVVVVVVV
          let offset = 0;
          if (lastfrag && offsetArr.length > 0) {
            offset = offsetArr.shift();
          }
          penX += scale * offset;
          //^^^^^^^^^^^
          //ASHLEY HERE: fix for kerning
          this._LayoutFragment(frag, penX, penY, scale);
          penX += frag.GetWidth() * scale;

          //ASHLEY HERE: fix for kerning
          //VVVVVVVVVVV
          lastfrag = frag;
          //^^^^^^^^^^^
          //ASHLEY HERE: fix for kerning
        }
      }
      _skymen_CanBeKerned(frag, nextFrag, forceSameFont = true) {
        if (
          !frag ||
          !frag.IsText() ||
          !frag.GetCharacterArray() ||
          !nextFrag ||
          !nextFrag.IsText() ||
          !nextFrag.GetCharacterArray()
        )
          return false;
        if (forceSameFont) {
          let fontString = this._GetFontString(true, frag, true);
          let fontString2 = this._GetFontString(true, nextFrag, true);
          if (fontString !== fontString2) return false;
        }
        return true;
      }
      _skymen_CreateKerningKey(frag, nextFrag) {
        let fontString = this._GetFontString(true, frag, true);
        let fontString2 = this._GetFontString(true, nextFrag, true);
        let lastChar = frag.GetCharacterArray()[frag.GetLength() - 1];
        let firstNextFragChar = nextFrag.GetCharacterArray()[0];
        return `${fontString}_${lastChar}_${fontString2}_${firstNextFragChar}`;
      }
      _GetFontString(useCssUnits, frag, skymen = false) {
        if (skymen && frag._skymenFontString) return frag._skymenFontString;
        let fontString = super._GetFontString(useCssUnits, frag);
        if (skymen) frag._skymenFontString = fontString;
        return fontString;
      }
    };
  }
}

// SPLITGRAPHMES FIX
if (true) {
  /** FIXES BEING DONE HERE
   * Optimise Split Graphemes call by caching result and function call
   * I don't remember why I cached the result and if it actually helps
   * I am making the cache optional for now
   * */
  const C3 = self.C3;
  let intlSegmenter = null;
  let graphemeSplitter = null;
  if (self["Intl"] && self["Intl"]["Segmenter"])
    intlSegmenter = new self["Intl"]["Segmenter"]();
  else graphemeSplitter = new self.GraphemeSplitter();
  C3.SplitGraphemes = (function () {
    const cache = new Map();
    const useCache = true;

    function splitWithIntlSegmenter(str) {
      const ret = [];
      for (const s of intlSegmenter["segment"](str)) ret.push(s["segment"]);
      return ret;
    }
    function splitWithGraphemeSplitter(str) {
      return graphemeSplitter.splitGraphemes(str);
    }
    const splitterFunction = intlSegmenter
      ? splitWithIntlSegmenter
      : splitWithGraphemeSplitter;

    if (!useCache) return splitterFunction;
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
}
