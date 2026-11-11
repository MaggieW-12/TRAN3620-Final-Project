(function () {
  "use strict";

  const messages = {
    en: {
      skip: "Skip to content",
      brandSub: "English–Chinese humor corpus",
      navExplore: "Explore",
      navReport: "Learning report",
      navCodebook: "Codebook",
      navAi: "AI use",
      heroEyebrow: "A translation corpus story",
      heroTitle1: "What survives",
      heroTitle2: "the laugh?",
      heroLede:
        "Five hundred English-Chinese subtitle exchanges reveal where a joke is carried across intact, rephrased for effect, explained—or quietly flattened.",
      heroExplore: "Explore the corpus",
      heroRead: "Read the research",
      stageLabel: "Corpus specimen",
      stageCategory: "Direct retention",
      stageNote:
        "The pragmatic cue moves intact. The courtroom timing does the rest.",
      statPairs: "sentence pairs",
      statFrame: "source frame",
      statStrategies: "strategy categories",
      statChecked: "source checked",
      exploreTitle: "Read the corpus like a translator",
      exploreIntro:
        "Search both languages, narrow the dataset, then follow a cue through every linked view.",
      searchLabel: "Search the corpus",
      searchPlaceholder: "Search joke, laugh, 笑, 玩笑...",
      filterCategory: "Translation strategy",
      allStrategies: "All strategies",
      catDirectShort: "Direct retention",
      catFunctionalShort: "Functional equivalence",
      catExplicitShort: "Explicitation",
      catCompressionShort: "Compression / neutralization",
      filterCue: "Humor cue",
      allCues: "All cues",
      cueJoke: "Joke / kidding",
      cueLaughter: "Laughter",
      cueFunny: "Funny / absurd",
      cuePlay: "Play signal",
      filterChecked: "Checked entries only",
      resetFilters: "Reset",
      resultsShown: "entries match this view",
      sankeyTitle: "From cue to strategy",
      sankeyKind: "Sankey flow",
      sankeyCaption:
        "Which translation strategy most often carries each kind of humor cue?",
      clickFlow: "Click a band or node to filter the corpus.",
      heatTitle: "Where the pressure falls",
      heatMode: "Heatmap mode",
      heatCount: "Count",
      heatRow: "Row %",
      heatCaption:
        "How does each humor cue distribute across the four translation strategies?",
      clickCell: "Click a cell to isolate that cue-strategy pairing.",
      networkTitle: "The translation network",
      networkKind: "Force network",
      networkCaption:
        "Which English humor cues connect most often to which Chinese cue families?",
      networkNodes: "Top links",
      minimumLink: "Minimum link weight",
      reheat: "Reheat",
      networkHint: "Drag nodes, scroll to zoom, or click a term to search it.",
      tableTitle: "Every line has a trail",
      tableIntro:
        "Sort the evidence, inspect the source, or export the current view.",
      exportCsv: "Export current CSV",
      columnEnglish: "English",
      columnChinese: "Chinese",
      columnStrategy: "Strategy",
      columnChecked: "Check",
      columnSource: "Trace",
      emptyTitle: "No lines meet this pairing.",
      emptyBody: "Reset a filter and try another cue.",
      previous: "Previous",
      next: "Next",
      footerLine: "English–Chinese humor translation in subtitles.",
      sourceLabel: "Source",
      retrievedLabel: "Collected",
      seedLabel: "seed",
      checkedYes: "Checked",
      checkedNo: "Unchecked",
      traceLine: "Line",
      filterSearch: "Search",
      filterCheckedChip: "Checked only",
      filterCueChip: "Cue",
      filterCategoryChip: "Strategy",
      sortAscending: "Sort ascending",
      sortDescending: "Sort descending",
      chartEmpty: "No matching entries",
      allEntries: "All entries",
      reportKicker: "Learning report",
      reportTitle: "The joke is only half the translation",
      reportLede:
        "A study of 500 English-Chinese subtitle exchanges, from an explicit joke cue to its translated afterlives.",
      codebookKicker: "Annotation manual",
      codebookTitle: "A codebook built to be questioned",
      codebookLede:
        "Four strategy categories, tested on a small pilot and revised before the final 500 entries were classified.",
      aiKicker: "AI use declaration",
      aiTitle: "What the agent did—and what I checked",
      aiLede:
        "A concise account of tools, prompts, manual checks, mistakes, and the limits of automation in this project.",
      tocLabel: "On this page",
      originNav: "Origin",
      backgroundNav: "Background",
      gapNav: "Gap",
      questionsNav: "Questions",
      methodNav: "Method",
      analysisNav: "Analysis",
      conclusionNav: "Conclusion",
      reflectionNav: "Reflection",
      referencesNav: "References",
      definitionNav: "Definitions",
      boundaryNav: "Boundary rules",
      logNav: "Change log",
      practiceNav: "How to use it",
      toolsNav: "Tools used",
      divisionNav: "Division of work",
      promptsNav: "Prompts",
      errorsNav: "AI errors",
      limitsNav: "Limits",
    },
    zh: {
      skip: "跳至主要內容",
      brandSub: "英漢幽默翻譯語料庫",
      navExplore: "探索語料",
      navReport: "學習報告",
      navCodebook: "編碼手冊",
      navAi: "AI 使用",
      heroEyebrow: "一份翻譯語料的故事",
      heroTitle1: "笑聲之後，",
      heroTitle2: "留下了什麼？",
      heroLede:
        "五百組英漢字幕對話，呈現笑話在翻譯中如何被完整保留、改寫以維持效果、加以解釋，或悄然變得平淡。",
      heroExplore: "開始探索語料",
      heroRead: "閱讀研究報告",
      stageLabel: "語料樣本",
      stageCategory: "直接保留",
      stageNote: "語用提示完整移動；法庭喜劇的節奏完成其餘效果。",
      statPairs: "組句對",
      statFrame: "來源語料",
      statStrategies: "種翻譯策略",
      statChecked: "項已核對來源",
      exploreTitle: "像譯者一樣閱讀語料",
      exploreIntro:
        "以雙語搜尋收窄資料，再讓同一個幽默提示貫穿所有圖表與表格。",
      searchLabel: "搜尋語料",
      searchPlaceholder: "搜尋 joke、laugh、笑、玩笑...",
      filterCategory: "翻譯策略",
      allStrategies: "所有策略",
      catDirectShort: "直接保留",
      catFunctionalShort: "功能等值",
      catExplicitShort: "明晰化／增譯",
      catCompressionShort: "壓縮／中和",
      filterCue: "幽默提示",
      allCues: "所有提示",
      cueJoke: "笑話／開玩笑",
      cueLaughter: "笑聲",
      cueFunny: "好笑／荒謬",
      cuePlay: "遊戲訊號",
      filterChecked: "只顯示已核對項",
      resetFilters: "重設",
      resultsShown: "筆符合目前篩選",
      sankeyTitle: "從提示到策略",
      sankeyKind: "桑基流向圖",
      sankeyCaption: "各類幽默提示最常由哪一種翻譯策略承接？",
      clickFlow: "點擊流向帶或節點即可篩選語料。",
      heatTitle: "張力落在哪裡",
      heatMode: "熱圖模式",
      heatCount: "數量",
      heatRow: "列百分比",
      heatCaption: "各幽默提示如何在四類翻譯策略之間分布？",
      clickCell: "點擊方格，隔離該提示與策略的組合。",
      networkTitle: "翻譯關係網絡",
      networkKind: "力導向網絡",
      networkCaption: "哪些英語幽默提示最常連向哪些漢語提示類別？",
      networkNodes: "最高權重連結",
      minimumLink: "最低連結權重",
      reheat: "重新排列",
      networkHint: "拖曳節點、滾輪縮放，或點擊詞語搜尋。",
      tableTitle: "每一行都有來源線索",
      tableIntro: "排序證據、查看來源，或匯出目前篩選結果。",
      exportCsv: "匯出目前 CSV",
      columnEnglish: "英語",
      columnChinese: "漢語",
      columnStrategy: "策略",
      columnChecked: "核對",
      columnSource: "溯源",
      emptyTitle: "沒有行列符合此組合。",
      emptyBody: "重設一項篩選，再試另一個提示。",
      previous: "上一頁",
      next: "下一頁",
      footerLine: "字幕中的英漢幽默翻譯。",
      sourceLabel: "來源",
      retrievedLabel: "擷取日期",
      seedLabel: "隨機種子",
      checkedYes: "已核對",
      checkedNo: "未核對",
      traceLine: "行號",
      filterSearch: "搜尋",
      filterCheckedChip: "只限已核對",
      filterCueChip: "提示",
      filterCategoryChip: "策略",
      sortAscending: "遞增排序",
      sortDescending: "遞減排序",
      chartEmpty: "沒有符合的資料",
      allEntries: "全部資料",
      reportKicker: "學習報告",
      reportTitle: "笑話只是翻譯的一半",
      reportLede:
        "以五百組英漢字幕對話，追蹤一個明確的幽默提示如何走向不同譯法。",
      codebookKicker: "標註手冊",
      codebookTitle: "一本準備接受質疑的編碼手冊",
      codebookLede:
        "四個策略類別，先以小樣本測試與修訂，再套用到最終五百筆語料。",
      aiKicker: "AI 使用聲明",
      aiTitle: "代理做了什麼，我又核對了什麼",
      aiLede:
        "簡明記錄本計畫使用的工具、提示詞、人工核對、錯誤，以及自動化的限制。",
      tocLabel: "本頁內容",
      originNav: "緣起",
      backgroundNav: "背景",
      gapNav: "研究缺口",
      questionsNav: "研究問題",
      methodNav: "方法",
      analysisNav: "分析",
      conclusionNav: "結論",
      reflectionNav: "反思",
      referencesNav: "參考文獻",
      definitionNav: "類別定義",
      boundaryNav: "邊界規則",
      logNav: "修訂紀錄",
      practiceNav: "使用方法",
      toolsNav: "使用工具",
      divisionNav: "工作分工",
      promptsNav: "提示詞",
      errorsNav: "AI 錯誤",
      limitsNav: "限制",
    },
  };

  const categoryLabels = {
    "direct-retention": { en: "Direct retention", zh: "直接保留" },
    "functional-equivalence": { en: "Functional equivalence", zh: "功能等值" },
    explicitation: { en: "Explicitation / amplification", zh: "明晰化／增譯" },
    "compression-neutralization": {
      en: "Compression / neutralization",
      zh: "壓縮／中和",
    },
  };

  const cueLabels = {
    joke: { en: "joke / kidding", zh: "笑話／開玩笑" },
    laughter: { en: "laughter", zh: "笑聲" },
    funny: { en: "funny / absurd", zh: "好笑／荒謬" },
    play_signal: { en: "play signal", zh: "遊戲訊號" },
    none: { en: "no explicit Chinese cue", zh: "無明確漢語提示" },
  };

  function getLang() {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (query === "en" || query === "zh") return query;
    return localStorage.getItem("humor-lang") || "en";
  }

  function t(key) {
    const lang = getLang();
    return messages[lang]?.[key] || messages.en[key] || key;
  }

  function categoryLabel(key) {
    return categoryLabels[key]?.[getLang()] || key;
  }

  function cueLabel(key) {
    return cueLabels[key]?.[getLang()] || key;
  }

  function apply() {
    const lang = getLang();
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.documentElement.dataset.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (messages[lang]?.[key]) element.textContent = messages[lang][key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.dataset.i18nPlaceholder;
      if (messages[lang]?.[key]) element.placeholder = messages[lang][key];
    });

    document.querySelectorAll("[data-set-lang]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.setLang === lang)
      );
    });
  }

  function setLang(lang, save = true) {
    if (lang !== "en" && lang !== "zh") return;
    if (save) localStorage.setItem("humor-lang", lang);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState({}, "", url);
    apply();
    document.dispatchEvent(
      new CustomEvent("humorlangchange", { detail: { lang } })
    );
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-set-lang]");
    if (button) setLang(button.dataset.setLang);
  });

  apply();
  window.humorI18n = { t, apply, setLang, getLang, categoryLabel, cueLabel };
})();
