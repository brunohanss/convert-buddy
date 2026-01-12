fn main() {
    // Enable WASM threading features for wasm-bindgen-rayon
    #[cfg(all(target_arch = "wasm32", feature = "threads"))]
    {
        println!("cargo:rustc-cfg=web_sys_unstable_apis");
        println!("cargo:rerun-if-env-changed=CARGO_CFG_TARGET_FEATURE");
        
        // Ensure atomics and bulk-memory are available for wasm-bindgen-rayon
        let target_feature = std::env::var("CARGO_CFG_TARGET_FEATURE")
            .unwrap_or_default()
            .to_lowercase();
            
        if target_feature.contains("atomics") && target_feature.contains("bulk-memory") {
            println!("cargo:rustc-cfg=target_feature=\"atomics\"");
            println!("cargo:rustc-cfg=target_feature=\"bulk-memory\"");
        }
    }
}