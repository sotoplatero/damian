/**
 * Where Cervantes is downloaded from: the asset of whatever release is marked
 * Latest in the public `sotoplatero/cervantes` repo. GitHub resolves
 * `releases/latest/download/<asset>` on every request, so publishing a release
 * there updates every link, including ones mailed months ago.
 *
 * Read by the delivery email (`resend.ts`) and by the `/cervantes.zip` redirect
 * that keeps the links mailed before the move working.
 */
export const CERVANTES_RELEASE_URL =
	'https://github.com/sotoplatero/cervantes/releases/latest/download/cervantes.zip';
