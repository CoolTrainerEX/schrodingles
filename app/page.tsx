"use client";
import { Canvas } from "@react-three/fiber";
import { Color, Vector3 } from "three";
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
import QuantumNumbers from "@/lib/quantum-numbers";
import Point from "@/lib/point";
import { listen } from "@tauri-apps/api/event";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const defaultQn: QuantumNumbers = { n: 1, l: 0, ml: 0 };
const defaultSampleSize = 100;

export default function Home() {
  const [pts, setPts] = useState<Point[]>([]);
  const [{ n, l }, setQn] = useState(defaultQn);
  const [currentN, setCurrentN] = useState(defaultQn.n),
    [currentL, setCurrentL] = useState(defaultQn.l),
    [currentMl, setCurrentMl] = useState(defaultQn.ml),
    [currentSampleSize, setCurrentSampleSize] = useState(defaultSampleSize),
    [progress, setProgress] = useState(0);
  const [nValid, setNValid] = useState(true),
    [lValid, setLValid] = useState(true),
    [mlValid, setMlValid] = useState(true),
    [sampleSizeValid, setSampleSizeValid] = useState(true);

  useEffect(() => {
    invoke<QuantumNumbers>("set_quantum_numbers", {
      quantumNumbers: defaultQn,
    });

    invoke<number>("set_sample_size", {
      sampleSize: defaultSampleSize,
    });

    invoke<(Omit<Point, "position"> & { position: number[] })[]>("calc").then(
      (value) =>
        setPts(
          value.map((value) => ({
            ...value,
            position: new Vector3(...value.position),
          })),
        ),
    );

    listen<number>("progress", ({ payload }) => setProgress(payload));
  }, []);

  return (
    <>
      <div className="fixed -z-10 h-full w-full">
        <Canvas>
          <OrbitControls />
          <points>
            <bufferGeometry>
              <bufferAttribute
                args={[
                  Float32Array.from(
                    pts.flatMap(({ position }) => position.toArray()),
                  ),
                  3,
                ]}
                attach="attributes-position"
              />
              <bufferAttribute
                args={[
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
                  3,
                ]}
                attach="attributes-color"
              />
            </bufferGeometry>
            <pointsMaterial size={0.1} vertexColors sizeAttenuation />
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
            action={(formData) => {
              invoke("set_quantum_numbers", {
                quantumNumbers: {
                  n: Number.parseInt(formData.get("n") as string),
                  l: Number.parseInt(formData.get("l") as string),
                  ml: Number.parseInt(formData.get("ml") as string),
                },
              });

              invoke<(Omit<Point, "position"> & { position: number[] })[]>(
                "calc",
              ).then((value) =>
                setPts(
                  value.map((value) => ({
                    ...value,
                    position: new Vector3(...value.position),
                  })),
                ),
              );
            }}
            className="p-4"
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
                    value={currentN}
                    min={1}
                    step={1}
                    required
                    onChange={({ target }) => {
                      setCurrentN(target.valueAsNumber);
                      setNValid(target.checkValidity());

                      if (nValid)
                        setQn((prevState) => ({
                          ...prevState,
                          n: target.valueAsNumber,
                        }));
                    }}
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
                    value={currentL}
                    max={n - 1}
                    step={1}
                    required
                    onChange={({ target }) => {
                      setCurrentL(target.valueAsNumber);
                      setLValid(target.checkValidity());

                      if (lValid)
                        setQn((prevState) => ({
                          ...prevState,
                          l: target.valueAsNumber,
                        }));
                    }}
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
                    value={currentMl}
                    min={-l}
                    max={l}
                    step={1}
                    required
                    onChange={({ target }) => {
                      setCurrentMl(target.valueAsNumber);
                      setMlValid(target.checkValidity());
                    }}
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
                    value={currentSampleSize}
                    min={0}
                    step={1}
                    required
                    onChange={({ target }) => {
                      setCurrentSampleSize(target.valueAsNumber);
                      setSampleSizeValid(target.checkValidity());
                    }}
                    aria-invalid={!sampleSizeValid}
                  />
                </Field>
              </FieldGroup>
              <Field>
                <Button type="submit">Set</Button>
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
