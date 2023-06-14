import React, { useEffect } from "react";
import { html as enHtml } from "../doc/tutorial.en.md";
import { html as jaHtml } from "../doc/tutorial.ja.md";
import "github-markdown-css/github-markdown-dark.css";
import "prism-themes/themes/prism-vsc-dark-plus.min.css";
import Prism from "prismjs";

export default function Tutorial() {
  const lang = location.hash === "#ja" ? "ja" : "en";
  const html = lang === "ja" ? jaHtml : enHtml;
  useEffect(() => {
    Prism.highlightAll();
  }, []);
  return (
    <div className="horizontal-center">
      <div className="container">
        <div style={{ textAlign: "right", padding: "10px 20px" }}>
          <a
            style={{ fontWeight: lang === "en" ? "bold" : undefined }}
            href="#en"
          >
            English
          </a>{" "}
          |{" "}
          <a
            style={{ fontWeight: lang === "ja" ? "bold" : undefined }}
            href="#ja"
          >
            日本語
          </a>
        </div>
        <div
          className="markdown-body"
          style={{
            padding: "40px 20px 100px",
            marginBottom: 40,
            boxSizing: "border-box",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        ></div>
      </div>
    </div>
  );
}
