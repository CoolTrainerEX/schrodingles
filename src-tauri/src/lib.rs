use std::{f32, f64, sync::Mutex};

use glam::Vec3;
use num_complex::Complex64;
use rand::{random, random_bool};
use serde::{Deserialize, Serialize};
use statrs::function::gamma::gamma;
use tauri::{generate_handler, Emitter, Manager, Runtime};

#[derive(Default)]
struct AppState {
    quantum_numbers: Mutex<QuantumNumbers>,
    sample_size: Mutex<usize>,
}

#[derive(Default, Serialize, Deserialize, Clone, Copy)]
struct QuantumNumbers {
    n: u8,
    l: u8,
    ml: i8,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.manage(AppState::default());

            Ok(())
        })
        .invoke_handler(generate_handler![
            set_quantum_numbers,
            set_sample_size,
            calc
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn set_quantum_numbers(
    state: tauri::State<'_, AppState>,
    quantum_numbers: QuantumNumbers,
) -> Result<(), String> {
    *state.quantum_numbers.lock().unwrap() = quantum_numbers;
    Ok(())
}

#[tauri::command]
async fn set_sample_size(
    state: tauri::State<'_, AppState>,
    sample_size: usize,
) -> Result<(), String> {
    *state.sample_size.lock().unwrap() = sample_size;
    Ok(())
}

#[derive(Serialize)]
struct Point {
    position: Vec3,
    phase: f32,
}

#[tauri::command]
async fn calc<R: Runtime>(
    app: tauri::AppHandle<R>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Point>, String> {
    let quantum_numbers = state.quantum_numbers.lock().unwrap();
    let sample_size = *state.sample_size.lock().unwrap();
    let mut points = Vec::with_capacity(sample_size);

    while points.len() < sample_size {
        let r =
            (10 * quantum_numbers.n * quantum_numbers.n) as f32 * random::<f32>().powf(1.0 / 3.0);
        let theta = (random::<f32>() * 2.0 - 1.0).acos();
        let phi = random::<f32>() * 2.0 * f32::consts::PI;

        let wave = psi(r.into(), theta.into(), phi.into(), *quantum_numbers);

        if random_bool(wave.norm_sqr()) {
            points.push(Point {
                position: Vec3::new(
                    r * theta.sin() * phi.cos(),
                    r * theta.sin() * phi.sin(),
                    r * theta.cos(),
                ),
                phase: wave.arg() as f32,
            });

            let _ = app.emit("progress", (points.len() * 100) / points.capacity());
        }
    }

    Ok(points)
}

fn psi(r: f64, theta: f64, phi: f64, quantum_numbers: QuantumNumbers) -> Complex64 {
    let n = quantum_numbers.n as f64;
    let l = quantum_numbers.l as f64;
    let ml = quantum_numbers.ml as f64;

    let rho = (2.0 * r) / n;

    Complex64::from_polar(1.0, ml * phi)
        * ((2.0 / n).powi(3) * (gamma(n - l) / (2.0 * n * gamma(n + l + 1.0)))).sqrt()
        * (-rho / 2.0).exp()
        * rho.powf(l)
        * assoc_laguerre(
            quantum_numbers.n - quantum_numbers.l - 1,
            2 * quantum_numbers.l + 1,
            rho,
        )
        * (((2.0 * l + 1.0) / (4.0 * f64::consts::PI))
            * (gamma(l - ml.abs() + 1.0) / gamma(l + ml.abs() + 1.0)))
        .sqrt()
        * associated_p(
            quantum_numbers.l,
            quantum_numbers.ml.abs() as u8,
            theta.cos(),
        )
}

fn associated_p(l: u8, m: u8, x: f64) -> f64 {
    let mut pmm = 1.0;

    if m > 0 {
        let somx2 = ((1.0 - x) * (1.0 + x)).sqrt();
        let mut fact = 1.0;

        for _ in 1..=m {
            pmm *= -fact * somx2;
            fact += 2.0;
        }
    }

    if l == m {
        return pmm;
    }

    let mut pmmp1 = x * (2.0 * m as f64 + 1.0) * pmm;

    if l == m + 1 {
        return pmmp1;
    }

    let mut pll = 0.0;

    for ll in (m + 2)..=l {
        let ll_f = ll as f64;
        let m_f = m as f64;
        pll = (x * (2.0 * ll_f - 1.0) * pmmp1 - (ll_f + m_f - 1.0) * pmm) / (ll_f - m_f);
        pmm = pmmp1;
        pmmp1 = pll;
    }

    pll
}

fn assoc_laguerre(n: u8, k: u8, x: f64) -> f64 {
    let mut l0 = 1.0;

    if n == 0 {
        return l0;
    }

    let mut l1 = 1.0 + k as f64 - x;

    if n == 1 {
        return l1;
    }

    for i in 1..n {
        let i_f = i as f64;
        let k_f = k as f64;
        let next = ((2.0 * i_f + k_f + 1.0 - x) * l1 - (i_f + k_f) * l0) / (i_f + 1.0);
        l0 = l1;
        l1 = next;
    }

    l1
}
