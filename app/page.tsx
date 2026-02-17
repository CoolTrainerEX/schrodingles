"use client";
import { Canvas } from "@react-three/fiber";
import { Color } from "three";
import { OrbitControls } from "@react-three/drei";
import Form from "next/form";
import {
  FieldGroup,
  FieldSet,
  FieldDescription,
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const defaultQn = { n: 1, l: 0, ml: 0 };
const defaultSampleSize = 100;

export default function Home() {
  const [positions, setPositions] = useState<Float32Array>(new Float32Array()),
    [phases, setPhases] = useState<Float32Array>(new Float32Array());
  const [formData, setFormData] = useState({
    quantumNumbers: defaultQn,
    sampleSize: defaultSampleSize,
  });
  const [n, setN] = useState(defaultQn.n.toLocaleString()),
    [l, setL] = useState(defaultQn.l.toLocaleString()),
    [ml, setMl] = useState(defaultQn.ml.toLocaleString()),
    [sampleSize, setSampleSize] = useState(defaultSampleSize.toLocaleString()),
    [progress, setProgress] = useState(100);
  const [nValid, setNValid] = useState(true),
    [lValid, setLValid] = useState(true),
    [mlValid, setMlValid] = useState(true),
    [sampleSizeValid, setSampleSizeValid] = useState(true);

  useEffect(() => {
    (async () => {
      console.log("l");
      const pts = await invoke<{ position: number[]; phase: number }[]>(
        "calc",
        formData,
      );
      console.log("s");

      setPositions(Float32Array.from(pts.flatMap(({ position }) => position)));
      setPhases(
        Float32Array.from(
          pts.flatMap(({ phase }) => {
            const color = new Color().setHSL(
              (phase + Math.PI) / (2 * Math.PI),
              1,
              0.5,
            );

            return [color.r, color.g, color.b];
          }),
        ),
      );
    })();
  }, [formData]);

  // Init
  useEffect(() => {
    let unlisten: UnlistenFn;

    (async () => {
      unlisten = await listen<number>("progress", ({ payload }) =>
        setProgress(payload),
      );
    })();

    return () => unlisten?.();
  }, []);

  return (
    <>
      <div className="fixed -z-10 h-full w-full">
        <Canvas>
          <OrbitControls />
          <points>
            <bufferGeometry>
              <bufferAttribute
                args={[positions, 3]}
                attach="attributes-position"
              />
              <bufferAttribute args={[phases, 3]} attach="attributes-color" />
            </bufferGeometry>
            <pointsMaterial size={0.5} vertexColors sizeAttenuation />
          </points>
          <ambientLight intensity={10} />
        </Canvas>
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="float-end m-4 rounded-full">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-auto">
          <SheetHeader>
            <SheetTitle>Quantum Numbers</SheetTitle>
          </SheetHeader>
          <Form
            action={() => {
              setProgress(0);
              setFormData({
                quantumNumbers: {
                  n: Number.parseInt(n),
                  l: Number.parseInt(l),
                  ml: Number.parseInt(ml),
                },
                sampleSize: Number.parseInt(sampleSize),
              });
            }}
            className="p-4"
            onChange={({ currentTarget: { elements } }) => {
              setNValid(
                (elements.namedItem("n") as HTMLInputElement).checkValidity(),
              );
              setLValid(
                (elements.namedItem("l") as HTMLInputElement).checkValidity(),
              );
              setMlValid(
                (elements.namedItem("ml") as HTMLInputElement).checkValidity(),
              );
              setSampleSizeValid(
                (
                  elements.namedItem("sample-size") as HTMLInputElement
                ).checkValidity(),
              );
            }}
          >
            <FieldSet>
              <FieldGroup>
                <Field data-invalid={!nValid}>
                  <FieldLabel htmlFor="n" className="font-serif italic">
                    n
                  </FieldLabel>
                  <Input
                    id="n"
                    name="n"
                    type="number"
                    placeholder={defaultQn.n.toLocaleString()}
                    value={n}
                    min={1}
                    step={1}
                    required
                    onChange={({ target: { value } }) => setN(value)}
                    aria-invalid={!nValid}
                  />
                  <FieldDescription>Principal Quantum Number</FieldDescription>
                </Field>
                <Field data-invalid={!lValid}>
                  <FieldLabel htmlFor="l" className="font-serif italic">
                    l
                  </FieldLabel>
                  <Input
                    id="l"
                    name="l"
                    type="number"
                    placeholder={defaultQn.l.toLocaleString()}
                    value={l}
                    min={0}
                    max={(Number.parseInt(n) - 1).toLocaleString()}
                    step={1}
                    required
                    onChange={({ target: { value } }) => setL(value)}
                    aria-invalid={!lValid}
                  />
                  <FieldDescription>
                    Angular Momentum Quantum Number
                  </FieldDescription>
                </Field>
                <Field data-invalid={!mlValid}>
                  <FieldLabel htmlFor="ml" className="font-serif italic">
                    m<sub>l</sub>
                  </FieldLabel>
                  <Input
                    id="ml"
                    name="ml"
                    type="number"
                    placeholder={defaultQn.ml.toLocaleString()}
                    value={ml}
                    min={(-l).toLocaleString()}
                    max={l}
                    step={1}
                    required
                    onChange={({ target: { value } }) => setMl(value)}
                    aria-invalid={!mlValid}
                  />
                  <FieldDescription>Magnetic Quantum Number</FieldDescription>
                </Field>
                <Field data-invalid={!sampleSizeValid}>
                  <FieldLabel htmlFor="sample-size">Sample Size</FieldLabel>
                  <Input
                    id="sample-size"
                    name="sample-size"
                    type="number"
                    placeholder={defaultSampleSize.toLocaleString()}
                    value={sampleSize}
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    step={1}
                    required
                    onChange={({ target: { value } }) => setSampleSize(value)}
                    aria-invalid={!sampleSizeValid}
                  />
                </Field>
              </FieldGroup>
              <Field>
                <Button type="submit" disabled={progress !== 100}>
                  {progress === 100 ? "Set" : <Spinner />}
                </Button>
              </Field>
            </FieldSet>
          </Form>
        </SheetContent>
      </Sheet>
      <div className={cn("mx-4", progress === 100 && "hidden")}>
        <Progress value={progress} />
      </div>
    </>
  );
}
