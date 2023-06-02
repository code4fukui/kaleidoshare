import React, { useEffect, useRef } from "react";

import {
  Engine,
  Render,
  Runner,
  Body,
  Composite,
  Common,
  Bodies,
  Vertices,
  Vector,
} from "matter-js";
import decomp from "poly-decomp";
import {
  OutColor,
  OutFloat,
  OutObject,
  OutSpinner,
  Output,
} from "../../schema/output.mjs";

Common.setDecomp(decomp);

type World = {
  getImage: () => HTMLImageElement;
};
export type WorldOptions = {
  size: number;
  spinnerRadiusRatio: number;
  clipRadiusRatio: number;
};

const World = React.memo(function World(props: {
  options: WorldOptions;
  output: Output;
  onReady: (world: World) => void;
}) {
  const { options, output, onReady } = props;

  const worldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const worldElement = worldRef.current!;
    const { render, runner, engine, update } = setupWorld(
      worldElement,
      options,
      output
    );
    onReady({
      getImage: () => {
        const src = render.canvas;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.width = src.width;
        image.height = src.height;
        image.src = src.toDataURL();
        return image;
      },
    });

    const startTime = Date.now();
    let running = true;
    let lastTime = Date.now();
    function step() {
      if (!running) return;
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      update(Date.now() - startTime);
      Runner.tick(runner, engine, delta);
      Render.world(render);
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    return () => {
      running = false;
      worldElement.innerHTML = "";
    };
  }, [options, output]);

  return (
    <div
      style={{
        width: options.size,
        height: options.size,
      }}
      ref={worldRef}
    ></div>
  );
});
export default World;

function setupWorld(
  element: HTMLElement,
  options: WorldOptions,
  output: Output
) {
  const { size, spinnerRadiusRatio, clipRadiusRatio } = options;

  const spinnerRadius = size * spinnerRadiusRatio;
  const clipRadius = size * clipRadiusRatio; // TODO: 切り抜き範囲を表示

  const engine = Engine.create();
  const createCanvas = (width: number, height: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.oncontextmenu = () => false;
    canvas.onselectstart = () => false;
    // willReadFrequently は canvas を作って最初に getContext() するときに設定する必要がある
    // Render.create() に canvas を生成させると内部で getContext() してしまうので、
    // ここで canvas を生成して getContext() する必要がある
    // https://stackoverflow.com/questions/74101155/chrome-warning-willreadfrequently-attribute-set-to-true/74136040
    canvas.getContext("2d", { willReadFrequently: true });
    return canvas;
  };
  const spinnerMatter = createSpinner(output.spinner, size);
  const objects = output.objects;
  const objectsMatter = objects.map((object) => createBody(object, size));

  Composite.add(engine.world, [spinnerMatter]);
  Composite.add(engine.world, objectsMatter);

  const render = Render.create({
    element,
    canvas: createCanvas(size, size),
    engine: engine,
    options: {
      width: size,
      height: size,
      wireframes: false,
    },
  });
  Render.lookAt(render, {
    min: { x: -spinnerRadius, y: -spinnerRadius },
    max: { x: spinnerRadius, y: spinnerRadius },
  });
  const runner = Runner.create();
  return {
    render,
    runner,
    engine,
    update: (time: number) => {
      for (let i = 0; i < objectsMatter.length; i++) {
        const objectMatter = objectsMatter[i];
        const object = objects[i];
        updateBody(object, objectMatter, size, time);
      }

      Body.rotate(spinnerMatter, 0.01);
    },
  };
}
function createSpinner(spinner: OutSpinner, size: number) {
  return Bodies.fromVertices(
    0,
    0,
    [
      spinner.vertices.map(({ x, y }) => {
        return Vector.create(x * size, y * size);
      }),
    ],
    {
      isStatic: true,
      render: { fillStyle: "#eea" },
    }
  );
}
function createBody(object: OutObject, size: number): Body {
  const options: Matter.IBodyDefinition = {
    render: {
      fillStyle: getCurrentColor(object.fill, 0),
      strokeStyle: getCurrentColor(object.stroke, 0),
      lineWidth: getCurrentFloat(object.strokeWidth, 0) * size,
    },
  };
  switch (object.type) {
    case "circle":
      return Bodies.circle(
        0,
        0,
        getCurrentFloat(object.radius, 0) * size,
        options
      );
    case "rectangle":
      return Bodies.rectangle(
        0,
        0,
        getCurrentFloat(object.width, 0) * size,
        getCurrentFloat(object.height, 0) * size,
        options
      );
    case "polygon":
      return Bodies.polygon(
        0,
        0,
        object.sides,
        getCurrentFloat(object.radius, 0) * size,
        options
      );
  }
}
function updateBody(object: OutObject, body: Body, size: number, time: number) {
  body.render.fillStyle = getCurrentColor(object.fill, time);
  body.render.strokeStyle = getCurrentColor(object.stroke, time);
  body.render.lineWidth = getCurrentFloat(object.strokeWidth, time) * size;
  switch (object.type) {
    case "circle": {
      const c = body.position;
      const currentRadius = Vector.magnitude(Vector.sub(body.vertices[0], c));
      const nextRadius = getCurrentFloat(object.radius, time) * size;
      const scale = nextRadius / currentRadius;
      const vertices = body.vertices.map((v) => {
        return Vector.add(Vector.mult(Vector.sub(v, c), scale), c);
      });
      Body.setVertices(body, Vertices.create(vertices, body));
      Body.set(body, "circleRadius", nextRadius);
      break;
    }
    case "rectangle": {
      const [v0, v1, , v3] = body.vertices;
      const v01 = Vector.sub(v1, v0);
      const v03 = Vector.sub(v3, v0);
      const currentWidth = Vector.magnitude(v01);
      const currentHeight = Vector.magnitude(v03);
      const nextWidth = getCurrentFloat(object.width, time) * size;
      const nextHeight = getCurrentFloat(object.height, time) * size;
      const scaleW = nextWidth / currentWidth;
      const scaleH = nextHeight / currentHeight;
      const v4 = Vector.add(v0, Vector.mult(v01, scaleW));
      const v5 = Vector.add(v4, Vector.mult(v03, scaleH));
      const v6 = Vector.add(v0, Vector.mult(v03, scaleH));
      Body.setVertices(body, Vertices.create([v0, v4, v5, v6], body));
      break;
    }
    case "polygon": {
      const c = body.position;
      const currentRadius = Vector.magnitude(Vector.sub(body.vertices[0], c));
      const nextRadius = getCurrentFloat(object.radius, time) * size;
      const scale = nextRadius / currentRadius;
      const vertices = body.vertices.map((v) => {
        return Vector.add(Vector.mult(Vector.sub(v, c), scale), c);
      });
      Body.setVertices(body, Vertices.create(vertices, body));
      break;
    }
  }
}
function getCurrentFloat(float: OutFloat, time: number): number {
  if (typeof float === "number") {
    return float;
  }
  const angle = float.angle + Math.PI * 2 * float.frequency * (time / 1000);
  return (
    getCurrentFloat(float.offset, time) +
    getCurrentFloat(float.amplitude, time) * Math.sin(angle)
  );
}
function getCurrentColor(color: OutColor, time: number): string {
  if (typeof color === "string") {
    return color;
  }
  if (color.type === "rgb") {
    return `rgb(${getCurrentFloat(color.r, time)}, ${getCurrentFloat(
      color.g,
      time
    )}, ${getCurrentFloat(color.b, time)})`;
  }
  if (color.type === "hsl") {
    return `hsl(${getCurrentFloat(color.h, time)}, ${getCurrentFloat(
      color.s,
      time
    )}%, ${getCurrentFloat(color.l, time)}%)`;
  }
  return "transparent";
}
