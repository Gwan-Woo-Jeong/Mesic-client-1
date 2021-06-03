import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../reducers";
import EditMusic from "./EditMusic";
import ConfirmModal from "../UI/ConfirmModal";

function PostMusic({ postMusic, setPostMusic }: any) {
  const [openEditMusic, setOpenEditMusic] = useState<boolean>(false);
  const [updateMode, setUpdateMode] = useState<boolean>(false);
  const [openConfirm, setOpenConfirm] = useState<boolean>(false);

  return (
    <>
      <ConfirmModal
        confirmType="postMusic"
        openConfirm={openConfirm}
        setOpenConfirm={setOpenConfirm}
        setPostMusic={setPostMusic}
        setUpdateMode={setUpdateMode}
      />
      <EditMusic
        openEditMusic={openEditMusic}
        setOpenEditMusic={setOpenEditMusic}
        updateMode={updateMode}
        setUpdateMode={setUpdateMode}
        setPostMusic={setPostMusic}
      />
      <div className="music">
        <div className="detail-icon">
          <i className="fa fa-headphones" aria-hidden="true"></i>
        </div>

        {updateMode ? (
          <div className="music-content">
            <div className="edit-del-btn">
              <button
                className="edit-icon"
                onClick={() => setOpenEditMusic(true)}
              >
                수정
              </button>
              <button
                className="delete-icon"
                onClick={() => setOpenConfirm(true)}
              >
                삭제
              </button>
            </div>
            <div className="detail-line"></div>
            <div className="widget-outsider">
              <img src={postMusic.thumbnail}></img>
              <div>{postMusic.title}</div>
              <iframe
                src={
                  postMusic.video_Id
                    ? `https://www.youtube.com/embed/${postMusic.video_Id}`
                    : "https://www.youtube.com/embed/"
                }
                id="ytplayer"
                frameBorder="0"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="detail-line"></div>
            <button
              className="add-btn-music"
              onClick={() => setOpenEditMusic(true)}
            >
              +
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default PostMusic;
