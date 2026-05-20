import AVFoundation
import Foundation

let rootURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let sourceVideoURL = rootURL.appendingPathComponent("docs/video-contadores-web.mp4")
let narrationTextURL = rootURL.appendingPathComponent("docs/video-contadores-web-narracion.txt")
let narrationAudioURL = FileManager.default.temporaryDirectory
  .appendingPathComponent("hualas-contadores-web-narracion.aiff")
let outputURL = rootURL.appendingPathComponent("docs/video-contadores-web-con-voz.mp4")

let say = Process()
say.executableURL = URL(fileURLWithPath: "/usr/bin/say")
say.arguments = [
  "-v",
  "Paulina",
  "-r",
  "215",
  "-o",
  narrationAudioURL.path,
  "-f",
  narrationTextURL.path,
]
try say.run()
say.waitUntilExit()

guard say.terminationStatus == 0 else {
  fatalError("Could not generate narration audio")
}

let videoAsset = AVURLAsset(url: sourceVideoURL)
let audioAsset = AVURLAsset(url: narrationAudioURL)
let composition = AVMutableComposition()

guard
  let sourceVideoTrack = videoAsset.tracks(withMediaType: .video).first,
  let compositionVideoTrack = composition.addMutableTrack(
    withMediaType: .video,
    preferredTrackID: kCMPersistentTrackID_Invalid
  )
else {
  fatalError("Could not load video track")
}

try compositionVideoTrack.insertTimeRange(
  CMTimeRange(start: .zero, duration: videoAsset.duration),
  of: sourceVideoTrack,
  at: .zero
)
compositionVideoTrack.preferredTransform = sourceVideoTrack.preferredTransform

if
  let sourceAudioTrack = audioAsset.tracks(withMediaType: .audio).first,
  let compositionAudioTrack = composition.addMutableTrack(
    withMediaType: .audio,
    preferredTrackID: kCMPersistentTrackID_Invalid
  )
{
  let audioDuration =
    CMTimeCompare(audioAsset.duration, videoAsset.duration) < 0
    ? audioAsset.duration
    : videoAsset.duration
  try compositionAudioTrack.insertTimeRange(
    CMTimeRange(start: .zero, duration: audioDuration),
    of: sourceAudioTrack,
    at: .zero
  )
}

try? FileManager.default.removeItem(at: outputURL)

guard
  let exporter = AVAssetExportSession(
    asset: composition,
    presetName: AVAssetExportPresetHighestQuality
  )
else {
  fatalError("Could not create export session")
}

exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true

let semaphore = DispatchSemaphore(value: 0)
exporter.exportAsynchronously {
  semaphore.signal()
}
semaphore.wait()

if exporter.status == .completed {
  print("Wrote \(outputURL.path)")
} else {
  fatalError("Narrated video export failed: \(exporter.error?.localizedDescription ?? "unknown error")")
}
