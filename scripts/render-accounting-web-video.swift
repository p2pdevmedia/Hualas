import AVFoundation
import CoreImage
import CoreVideo
import Foundation

let videoWidth = 1280
let videoHeight = 720
let fps: Int32 = 24

let rootURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let framesURL = rootURL.appendingPathComponent("docs/video-contadores-web-frames")
let outputURL = rootURL.appendingPathComponent("docs/video-contadores-web.mp4")

struct Scene {
  let fileName: String
  let seconds: Double
}

let scenes: [Scene] = [
  .init(fileName: "01-dashboard-top.png", seconds: 5.0),
  .init(fileName: "02-dashboard-movements.png", seconds: 5.0),
  .init(fileName: "03-manual-payments.png", seconds: 5.0),
  .init(fileName: "04-social-fee.png", seconds: 4.5),
  .init(fileName: "05-debt-by-family.png", seconds: 5.0),
  .init(fileName: "06-movements-history.png", seconds: 5.0),
  .init(fileName: "07-activity-picker.png", seconds: 4.0),
  .init(fileName: "08-activity-detail.png", seconds: 4.5),
  .init(fileName: "09-mp-payments.png", seconds: 4.0),
  .init(fileName: "10-professors.png", seconds: 4.5),
  .init(fileName: "11-reports.png", seconds: 5.5),
]

try? FileManager.default.removeItem(at: outputURL)

guard
  let writer = try? AVAssetWriter(outputURL: outputURL, fileType: .mp4)
else {
  fatalError("Could not create video writer")
}

let videoSettings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: videoWidth,
  AVVideoHeightKey: videoHeight,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 6_000_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
  ],
]

let input = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
input.expectsMediaDataInRealTime = false

let adaptor = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: input,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: videoWidth,
    kCVPixelBufferHeightKey as String: videoHeight,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
  ]
)

guard writer.canAdd(input) else {
  fatalError("Could not add writer input")
}
writer.add(input)

let colorSpace = CGColorSpaceCreateDeviceRGB()
let ciContext = CIContext(options: [.workingColorSpace: colorSpace])

func makePixelBuffer(from url: URL) -> CVPixelBuffer {
  guard let image = CIImage(contentsOf: url) else {
    fatalError("Could not load frame \(url.path)")
  }

  var pixelBuffer: CVPixelBuffer?
  let status = CVPixelBufferCreate(
    kCFAllocatorDefault,
    videoWidth,
    videoHeight,
    kCVPixelFormatType_32BGRA,
    [
      kCVPixelBufferCGImageCompatibilityKey: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey: true,
    ] as CFDictionary,
    &pixelBuffer
  )

  guard status == kCVReturnSuccess, let pixelBuffer else {
    fatalError("Could not allocate pixel buffer")
  }

  let scaleX = CGFloat(videoWidth) / image.extent.width
  let scaleY = CGFloat(videoHeight) / image.extent.height
  let scaledImage = image.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
  let bounds = CGRect(x: 0, y: 0, width: videoWidth, height: videoHeight)
  ciContext.render(
    scaledImage,
    to: pixelBuffer,
    bounds: bounds,
    colorSpace: colorSpace
  )

  return pixelBuffer
}

guard writer.startWriting() else {
  fatalError("Could not start writing: \(writer.error?.localizedDescription ?? "unknown error")")
}
writer.startSession(atSourceTime: .zero)

let frameDuration = CMTime(value: 1, timescale: fps)
var frameIndex: Int64 = 0

for scene in scenes {
  let frameURL = framesURL.appendingPathComponent(scene.fileName)
  guard FileManager.default.fileExists(atPath: frameURL.path) else {
    fatalError("Missing frame \(frameURL.path)")
  }

  let pixelBuffer = makePixelBuffer(from: frameURL)
  let count = max(1, Int(round(scene.seconds * Double(fps))))

  for _ in 0..<count {
    while !input.isReadyForMoreMediaData {
      usleep(10_000)
    }

    let presentationTime = CMTimeMultiply(frameDuration, multiplier: Int32(frameIndex))
    guard adaptor.append(pixelBuffer, withPresentationTime: presentationTime) else {
      fatalError("Could not append frame \(scene.fileName)")
    }
    frameIndex += 1
  }
}

input.markAsFinished()

let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting {
  semaphore.signal()
}
semaphore.wait()

if writer.status == .completed {
  print("Wrote \(outputURL.path)")
} else {
  fatalError("Video export failed: \(writer.error?.localizedDescription ?? "unknown error")")
}
