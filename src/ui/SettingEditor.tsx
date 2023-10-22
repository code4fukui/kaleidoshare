/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import { Settings } from "../../schema/schema.js";
import schema from "../../schema/schema.json";
import { env } from "../domain/env";
import Ajv from "ajv";
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { Form } from "@rjsf/antd";
import { IChangeEvent } from "@rjsf/core";

const ajv = new Ajv();
const settingSchema = {
  ...schema,
  $ref: "#/definitions/Settings",
};
const validate = ajv.compile<Settings>(settingSchema);

const SettingEditor = React.memo(function SettingEditor(props: {
  settings: Settings;
  onChange: () => void;
  onApply: (json: unknown) => void;
  onWarningShownChange: (warningShown: boolean) => void;
}) {
  const { settings, onChange, onApply, onReady } = props;
  /*
  function handleSubmit(data: IChangeEvent<any, RJSFSchema, any>, event: React.FormEvent<any>) {
    event.stopPropagation();
    event.preventDefault();
    const json = data.formData;
    console.log(json);
    console.log(JSON.stringify(json, null, 2));
    if (validate(json)) {
      onApply(json);
    } else {
      console.log("invalid")
    }
    return false;
  }
  */
  function handleChange(data: IChangeEvent<any, RJSFSchema, any>, id?: string | undefined) {
    const json = data.formData;
    console.log(JSON.stringify(json, null, 2));
    if (validate(json)) {
      onApply(json);
    } else {
      console.log("invalid")
    }
  }
  //const schema2: RJSFSchema = schema.definitions.Output;
  
  const schema: RJSFSchema = {
    "type": "object",
    "required": [
      "background",
      "spinner",
      "objects"
    ],
    "properties": {
      "background": {
        "type": "string",
        "title": "background color",
        "default": "black"
      },
      "objects": {
        "items": {
          "properties": {
            "count": {
              "type": "integer",
              "default": 10
            },
            "weight": {
              "type": "number",
              "default": 1
            },
            "shape": {
              "anyOf": [
                {
                  "type": "object",
                  "title": "rectangle",
                  "properties": {
                    "type": {
                      "type": "string",
                      "default": "rectangle",
                      "const": "rectangle"
                    },
                    "width": {
                      "type": "number",
                      "default": 0.20
                    },
                    "height": {
                      "type": "number",
                      "default": 0.04
                    }
                  },
                  "required": [
                    "type",
                    "width",
                    "height"
                  ]
                },
                {
                  "type": "object",
                  "title": "circle",
                  "properties": {
                    "type": {
                      "type": "string",
                      "default": "circle",
                      "const": "circle"
                    },
                    "radius": {
                      "type": "number",
                      "default": 0.05
                    }
                  },
                  "required": [
                    "type",
                    "radius"
                  ]
                },
                {
                  "type": "object",
                  "title": "polygon",
                  "properties": {
                    "type": {
                      "type": "string",
                      "default": "polygon",
                      "const": "polygon"
                    },
                    "sides": {
                      "type": "integer",
                      "default": 5
                    },
                    "radius": {
                      "type": "number",
                      "default": 0.05
                    }
                  },
                  "required": [
                    "type",
                    "radius"
                  ]
                }
              ]
            },
            "stroke": {
              "type": "string",
              "default": "white"
            },
            "strokeWidth": {
              "type": "number",
              "default": 0.015
            },
            "fill": {
              "type": "string",
              "default": "transparent"
            }
          },
          "required": [
            "shape",
            "fill",
            "stroke",
            "strokeWidth",
            "weight"
          ],
          "type": "object"
        },
        "maxItems": 1000,
        "type": "array"
      },
      "spinner": {
        "type": "object",
        "properties": {
          "sides": {
            "type": "integer",
            "default": 3
          }
        },
        "required": [
          "sides"
        ]
      }
    }
  };
  
  return (
    <>
      <Form schema={schema} validator={validator} formData={settings} onChange={handleChange}/>
    </>
  );
});
export default SettingEditor;
