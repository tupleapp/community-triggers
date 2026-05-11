import Cocoa
import WebKit

let args = CommandLine.arguments
guard args.count >= 3 else { exit(1) }
let url = URL(fileURLWithPath: args[1])
let closeAfter = Double(args[2]) ?? 15.0

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let screen = NSScreen.main!
let size = NSSize(width: 800, height: 500)
let origin = NSPoint(
    x: screen.frame.midX - size.width / 2,
    y: screen.frame.midY - size.height / 2
)
let window = NSWindow(
    contentRect: NSRect(origin: origin, size: size),
    styleMask: [.borderless],
    backing: .buffered,
    defer: false
)
window.level = .floating
window.backgroundColor = .black
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

let webView = WKWebView(frame: window.contentView!.bounds)
webView.autoresizingMask = [.width, .height]
window.contentView!.addSubview(webView)
webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
window.makeKeyAndOrderFront(nil)

DispatchQueue.main.asyncAfter(deadline: .now() + closeAfter) {
    NSAnimationContext.runAnimationGroup({ ctx in
        ctx.duration = 0.5
        window.animator().alphaValue = 0
    }) { app.terminate(nil) }
}

app.run()
