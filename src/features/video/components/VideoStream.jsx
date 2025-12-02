function VideoStream() {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <img
        src={`${process.env.REACT_APP_API_URL}/video/stream`} // MJPEG-поток
        alt="Drone video stream"
        className="w-full max-h-[400px] object-contain"
      />
    </div>
  );
}

export default VideoStream;