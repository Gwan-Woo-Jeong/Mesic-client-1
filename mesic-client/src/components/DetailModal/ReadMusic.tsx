import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../reducers";
import ConfirmModal from "../UI/ConfirmModal";
import EditMusic from "../DetailModal/EditMusic";

function ReadMusic({ readMusic, setReadMusic }: any) {
  const { mode } = useSelector((state: RootState) => state.modeReducer).user;
  const [openConfirm, setOpenConfirm] = useState<boolean>(false);
  const [openEditMusic, setOpenEditMusic] = useState<boolean>(false);
  const [updateMode, setUpdateMode] = useState<boolean>(false);
  const [updateMusic, setUpdateMusic] = useState<any>(null);

  const updateReadMusic = () => {
    //서버 요청 updateMusic 전달
    //setReadMusic()
    //setUpdateMusic(null)
    //setUpdateMode(false)
  };

  return (
    <>
      <ConfirmModal
        confirmType="readMusic"
        openConfirm={openConfirm}
        setOpenConfirm={setOpenConfirm}
        setReadMusic={setReadMusic}
        updateMode={updateMode}
        setUpdateMusic={setUpdateMusic}
      />
      <EditMusic
        openEditMusic={openEditMusic}
        setOpenEditMusic={setOpenEditMusic}
        setUpdateMode={setUpdateMode}
        setUpdateMusic={setUpdateMusic}
        setReadMusic={setReadMusic}
      />
      {updateMode ? (
        <div className="border">
          <div className="ifram-outsider">
            <button
              onClick={() => {
                setOpenEditMusic(true);
              }}
            >
              수정
            </button>
            <div>
              <iframe
                src={
                  updateMusic.video_Id
                    ? `https://www.youtube.com/embed/${updateMusic.video_Id}`
                    : "https://www.youtube.com/embed/"
                }
              ></iframe>
            </div>
            <button onClick={updateReadMusic}>저장</button>
            <button
              onClick={() => {
                setUpdateMode(false);
                setUpdateMusic(null);
              }}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="border">
          {readMusic === null ? (
            <div className="ifram-outsider">
              <button onClick={() => setOpenEditMusic(true)}>+</button>
            </div>
          ) : (
            <div>
              <button onClick={() => setOpenEditMusic(true)}>수정</button>
              <button onClick={() => setOpenConfirm(true)}>삭제</button>
              <div>
                <iframe
                  src={
                    readMusic.video_Id
                      ? `https://www.youtube.com/embed/${readMusic.video_Id}`
                      : "https://www.youtube.com/embed/"
                  }
                ></iframe>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ReadMusic;