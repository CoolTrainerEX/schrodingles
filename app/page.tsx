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

const defaultQn: QuantumNumbers = { n: 1, l: 0, ml: 0 };
const defaultSampleSize = 50;

export default function Home() {
  const [{ n, l }, setQn] = useState(defaultQn);
  const [nValid, setNValid] = useState(true),
    [lValid, setLValid] = useState(true),
    [mlValid, setMlValid] = useState(true),
    [sampleSizeValid, setSampleSizeValid] = useState(true);

  const [pts, setPts] = useState<Point[]>([]);

  useEffect(() => {
    invoke<QuantumNumbers>("set_quantum_numbers", {
      quantumNumbers: defaultQn,
    }).then((value) => setQn(value));

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
  }, []);

  return (
    <>
      <div className="fixed w-full h-full -z-10">
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
            <pointsMaterial size={0.05} vertexColors sizeAttenuation />
          </points>
          <ambientLight intensity={5} />
        </Canvas>
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="rounded-full float-end m-4">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-auto">
          <SheetHeader>
            <SheetTitle>Quantum Numbers</SheetTitle>
          </SheetHeader>
          <Form
            action=""
            className="p-4"
            onChange={({ currentTarget }) => {
              if (!currentTarget.checkValidity()) return;

              const formData = new FormData(currentTarget);

              invoke<QuantumNumbers>("set_quantum_numbers", {
                quantumNumbers: {
                  n: Number.parseInt(formData.get("n") as string),
                  l: Number.parseInt(formData.get("l") as string),
                  ml: Number.parseInt(formData.get("ml") as string),
                },
              }).then((value) => setQn(value));

              invoke("set_sample_size", {
                sampleSize: Number.parseInt(
                  formData.get("sample-size") as string,
                ),
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
          >
            <FieldSet>
              <FieldGroup>
                <Field data-invalid={!nValid}>
                  <FieldLabel htmlFor="n" className="italic font-serif">
                    n
                  </FieldLabel>
                  <Input
                    id="n"
                    name="n"
                    type="number"
                    placeholder={defaultQn.n.toLocaleString()}
                    defaultValue={defaultQn.n}
                    min={1}
                    step={1}
                    required
                    onChange={({ target }) => setNValid(target.checkValidity())}
                    aria-invalid={!nValid}
                  />
                  <FieldDescription>Principal Quantum Number</FieldDescription>
                </Field>
                <Field data-invalid={!lValid}>
                  <FieldLabel htmlFor="l" className="italic font-serif">
                    l
                  </FieldLabel>
                  <Input
                    id="l"
                    name="l"
                    type="number"
                    placeholder={defaultQn.l.toLocaleString()}
                    defaultValue={defaultQn.l}
                    max={n - 1}
                    step={1}
                    required
                    onChange={({ target }) => setLValid(target.checkValidity())}
                    aria-invalid={!lValid}
                  />
                  <FieldDescription>
                    Angular Momentum Quantum Number
                  </FieldDescription>
                </Field>
                <Field data-invalid={!mlValid}>
                  <FieldLabel htmlFor="ml" className="italic font-serif">
                    m<sub>l</sub>
                  </FieldLabel>
                  <Input
                    id="ml"
                    name="ml"
                    type="number"
                    placeholder={defaultQn.ml.toLocaleString()}
                    defaultValue={defaultQn.ml}
                    min={-l}
                    max={l}
                    step={1}
                    required
                    onChange={({ target }) =>
                      setMlValid(target.checkValidity())
                    }
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
                    defaultValue={defaultSampleSize}
                    min={0}
                    step={1}
                    required
                    onChange={({ target }) =>
                      setSampleSizeValid(target.checkValidity())
                    }
                    aria-invalid={!mlValid}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}
