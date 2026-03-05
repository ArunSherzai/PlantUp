/**
 * Patches the expo-gl context to suppress unsupported pixelStorei warnings.
 * expo-gl doesn't support UNPACK_FLIP_Y_WEBGL, UNPACK_PREMULTIPLY_ALPHA_WEBGL,
 * and UNPACK_COLORSPACE_CONVERSION_WEBGL — but Three.js calls them on every
 * texture upload, causing massive log spam.
 *
 * Call this in the Canvas `onCreated` callback.
 */
export function patchExpoGL(state: { gl: any }) {
    try {
        const rawGl = state.gl.getContext();
        if (!rawGl || !rawGl.pixelStorei) return;

        const origPixelStorei = rawGl.pixelStorei.bind(rawGl);
        rawGl.pixelStorei = function (pname: number, param: any) {
            // These WebGL constants are not supported by expo-gl:
            // UNPACK_FLIP_Y_WEBGL = 37440 (0x9240)
            // UNPACK_PREMULTIPLY_ALPHA_WEBGL = 37441 (0x9241)
            // UNPACK_COLORSPACE_CONVERSION_WEBGL = 37443 (0x9243)
            if (pname === 37440 || pname === 37441 || pname === 37443) return;
            return origPixelStorei(pname, param);
        };
    } catch (e) {
        // Silently ignore patching errors
    }
}
