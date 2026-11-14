/// Clamped piecewise-linear 1D interpolation matching Python reference solver.
pub fn interp_1d(x: f64, xs: &[f64], ys: &[f64]) -> (f64, bool) {
    let out_of_range = x < xs[0] || x > xs[xs.len() - 1];
    let xc = x.clamp(xs[0], xs[xs.len() - 1]);
    if (xc - xs[xs.len() - 1]).abs() == 0.0 {
        return (ys[ys.len() - 1], out_of_range);
    }
    for i in 0..(xs.len() - 1) {
        if xs[i] <= xc && xc <= xs[i + 1] {
            let span = xs[i + 1] - xs[i];
            let t = if span > 0.0 { (xc - xs[i]) / span } else { 0.0 };
            return (ys[i] + t * (ys[i + 1] - ys[i]), out_of_range);
        }
    }
    (ys[0], out_of_range)
}

/// Clamped bilinear 2D lookup (SOC, Temp_C) matching Python reference solver.
pub fn interp_2d(
    soc: f64,
    temp_c: f64,
    soc_grid: &[f64],
    temp_grid: &[f64],
    values: &[Vec<f64>],
) -> (f64, bool) {
    let out_of_range = soc < soc_grid[0]
        || soc > soc_grid[soc_grid.len() - 1]
        || temp_c < temp_grid[0]
        || temp_c > temp_grid[temp_grid.len() - 1];
    let sc = soc.clamp(soc_grid[0], soc_grid[soc_grid.len() - 1]);
    let tc = temp_c.clamp(temp_grid[0], temp_grid[temp_grid.len() - 1]);

    let mut si = soc_grid.len() - 2;
    for i in 0..(soc_grid.len() - 1) {
        if sc <= soc_grid[i + 1] {
            si = i;
            break;
        }
    }
    let mut ti = temp_grid.len() - 2;
    for j in 0..(temp_grid.len() - 1) {
        if tc <= temp_grid[j + 1] {
            ti = j;
            break;
        }
    }

    let s0 = soc_grid[si];
    let s1 = soc_grid[si + 1];
    let t0 = temp_grid[ti];
    let t1 = temp_grid[ti + 1];
    let ws = if s1 > s0 { (sc - s0) / (s1 - s0) } else { 0.0 };
    let wt = if t1 > t0 { (tc - t0) / (t1 - t0) } else { 0.0 };

    let q00 = values[si][ti];
    let q01 = values[si][ti + 1];
    let q10 = values[si + 1][ti];
    let q11 = values[si + 1][ti + 1];
    let val = (1.0 - ws) * (1.0 - wt) * q00
        + (1.0 - ws) * wt * q01
        + ws * (1.0 - wt) * q10
        + ws * wt * q11;
    (val, out_of_range)
}

