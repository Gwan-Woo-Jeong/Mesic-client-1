import axios from "axios";
import React, { useState, useEffect, useCallback, useRef } from "react";
import SearchLocation from "../components/UI/SearchLocation";
import Nav from "../components/UI/Nav";
import { useDispatch, useSelector } from "react-redux";
import { clearCheckedRemove, switchMode } from ".././actions/index";
import { RootState } from ".././reducers";
import PostModal from "../components/DetailModal/PostModal";
import ReadModal from "../components/DetailModal/ReadModal";
import FollowList from "../components/UI/FollowList";
import { Dummies } from "../components/Guest/Dummies";
import AWS from "aws-sdk";

declare global {
  interface Window {
    kakao: any;
  }
}

function MainPage() {
  const dispatch = useDispatch();
  const state = useSelector((state: RootState) => state);
  const { isLogin, user_id, token } = state.userReducer.user;
  const { mode } = state.modeReducer.user;
  const {
    checkAdded,
    checkRemoved,
    checkedFollow,
    markerSet,
    currentMarker,
  }: any = state.modeReducer;

  // const [openModal, setOpenModal] = useState<boolean>(false);
  //로그인 컨트롤러
  const [loginController, setLoginController] = useState<boolean>(false);

  // DetailModal 열림
  const [openReadModal, setOpenReadModal] = useState<boolean>(false);
  const [openPostModal, setOpenPostModal] = useState<boolean>(false);

  // 키워드 검색
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [keywordSearchData, setKeywordSearchData] = useState<any>([]);
  const [searchMode, setSearchMode] = useState<boolean>(false);

  // 지도 생성
  const [map, setMap] = useState<any>({});
  const [LatLng, setLatLng] = useState<number[]>([
    37.5139795454969, 127.048963363388,
  ]);
  const [mapLevel, setMapLevel] = useState<number>(5);

  // 검색,포스트 위치
  const [searchLatLng, setSearchLatlng] = useState<number[]>([
    37.5139795454969, 127.048963363388,
  ]);
  const [postLatLng, setPostLatLng] = useState<number[]>([
    37.5139795454969, 127.048963363388,
  ]);

  // 검색,포스트 마커
  const [searchMarkers, setSearchMarkers] = useState<any[]>([]);
  const [postMarkers, setPostMarkers] = useState<any[]>([]);

  // 선택한 READ 마커의 데이터
  const [readMarkerData, setReadMarkerData] = useState<any>(null);

  // 모달 숨기기
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const detailModal = useRef<any>();

  // 로그인 유저의 핀 데이터
  const [myPinData, setMypinData] = useState<any[]>([]);
  const [pinUpdate, setPinUpdate] = useState<boolean>(false);

  // 미리보기 모두 저장
  // const [saveInfowindows, setSaveinfowindows] = useState<any[]>([]);

  // 지도 동적 렌더링
  useEffect(() => {
    window.kakao.maps.load(() => {
      loadKakaoMap();
    });
  }, [isLogin]);

  // 로그인 후 유저의 핀 가져오기
  useEffect(() => {
    if (isLogin || pinUpdate) {
      getMyPins();
    }
    return;
  }, [map, mode, isLogin, pinUpdate]);

  // 검색어가 바뀌면, 검색 요청
  useEffect(() => {
    searchKeyword();
  }, [keywordInput]);

  // 검색 위치가 바뀌면, 해당 위치에 마커 생성
  useEffect(() => {
    if (Object.keys(map).length > 0) {
      searchMarkerControl();
    }
  }, [searchLatLng]);

  // POST 위치가 바뀌면, 해당 위치에 마커 생성
  useEffect(() => {
    if (Object.keys(map).length > 0) {
      postMarkerControl();
    }
  }, [postLatLng]);

  // READ 마커를 클릭하면, POST 마커 사라짐
  useEffect(() => {
    if (Object.keys(map).length > 0) {
      deletePostMarkers();
    }
  }, [readMarkerData]);

  // POST, READ 모달이 켜지거나 꺼지면, 검색 마커가 사라짐
  useEffect(() => {
    if (Object.keys(map).length > 0) {
      deleteSearchMarkers();
    }
  }, [openPostModal, openReadModal]);

  // READ 마커 생성 시 POST 마커 삭제
  useEffect(() => {
    if (mode !== "POST") {
      deletePostMarkers();
    }
    return;
  }, [mode]);

  // 맵이 렌더링 되면, 유저의 READ 마커가 생성
  useEffect(() => {
    if (Object.keys(map).length > 0) {
      if (!isLogin) {
        viewDummies();
      } else {
        viewMyMarkers();
      }
    }
  }, [myPinData, map]);

  // 미리보기 사라지게 하기
  // useEffect(() => {
  //   deleteInfowindows();
  // });

  // 로그인 유저 핀 가져오기
  const getMyPins = () => {
    axios
      .get(`${process.env.REACT_APP_SERVER_URL}/pins/users/${user_id}`)
      .then((res) => res.data)
      .then((data) => {
        setMypinData(data);
        setPinUpdate(false);
      })
      .catch((err) => console.log(err));
  };

  // 키워드 검색 마커
  const searchMarkerControl = () => {
    if (searchMarkers.length > 0) {
      deleteSearchMarkers();
    }

    const markers = [];
    const position = new window.kakao.maps.LatLng(
      searchLatLng[0],
      searchLatLng[1]
    );

    const image = new window.kakao.maps.MarkerImage(
      `/images/marker/search-marker.gif`,
      new window.kakao.maps.Size(40, 70),
      { offset: new window.kakao.maps.Point(22, 70) }
    );

    const marker = new window.kakao.maps.Marker({
      image,
      position,
    });
    marker.setMap(map);
    markers.push(marker);
    setSearchMarkers(markers);
  };

  // 마커 삭제
  const deleteMyMarker = (pinId: any) => {
    const bucket = "mesic-photo-bucket";

    AWS.config.region = "ap-northeast-2";
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: "ap-northeast-2:2c7d94b9-746d-4871-abdd-69aa237048ca",
    });

    const s3 = new AWS.S3();

    const photoURL = readMarkerData.photo;
    const file = photoURL.split("/");
    const fileName = file[file.length - 1];
    const param = {
      Bucket: bucket,
      Key: `image/${fileName}`,
    }; //s3 업로드에 필요한 옵션 설정

    s3.deleteObject(param, function (err: any, data: any) {
      if (err) {
        console.log(err);
        return;
      }

      axios
        .delete(`${process.env.REACT_APP_SERVER_URL}/pins/${pinId}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          console.log(res);
          setOpenReadModal(false);
          dispatch(switchMode("NONE"));
        })
        .catch((err) => console.log(err));
    });
  };
  // (POST MODE) 지도 클릭 마커

  const postMarkerControl = () => {
    if (postMarkers.length > 0) {
      deletePostMarkers();
    }
    deleteSearchMarkers();
    const markers = [];
    const position = new window.kakao.maps.LatLng(postLatLng[0], postLatLng[1]);

    const image = new window.kakao.maps.MarkerImage(
      `/images/marker/post-marker.png`,
      new window.kakao.maps.Size(45, 45),
      { offset: new window.kakao.maps.Point(8, 50) }
    );

    const marker = new window.kakao.maps.Marker({
      image,
      position,
    });
    marker.setMap(map);
    markers.push(marker);
    setPostMarkers(markers);
  };

  // (READ MODE) 유저의 마커 생성

  const [myMarkers, setMyMarkers] = useState<any[]>([]);
  const viewMyMarkers = () => {
    deleteMyMarkers();
    // CREATED 모드일 때 방금 만들어진 데이터를 띄움
    if (mode === "CREATED") {
      handleMyMarkerClick(myPinData[myPinData.length - 1]._id);
    }

    const markers = [];
    for (let i = 0; i < myPinData.length; i += 1) {
      const position = new window.kakao.maps.LatLng(
        parseFloat(myPinData[i].location.longitude),
        parseFloat(myPinData[i].location.latitude)
      );

      const image = new window.kakao.maps.MarkerImage(
        "/images/marker/userpin.png",
        new window.kakao.maps.Size(90, 70)
      );

      const marker = new window.kakao.maps.Marker({
        image,
        map,
        position,
      });
      marker.id = myPinData[i]._id;

      window.kakao.maps.event.addListener(marker, "click", () => {
        // 마커 클릭 시
        infowindow.setMap(null);
        handleMyMarkerClick(marker.id);
      });

      const iwContent = document.createElement("div");
      iwContent.className = "preview";
      const musicContainer = document.createElement("div");
      musicContainer.className = "music-flex-box";
      const thumbnail = document.createElement("img");
      thumbnail.className = "preview-img";

      if (myPinData[i].music.thumbnail.length > 0) {
        thumbnail.src = myPinData[i].music.thumbnail;
      } else {
        thumbnail.src =
          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/CD_icon_test.svg/1200px-CD_icon_test.svg.png";
      }
      const titleContainer = document.createElement("div");
      titleContainer.className = "preview-title-container";
      const hideOverflow = document.createElement("div");
      hideOverflow.className = "hide-overflow";
      const title = document.createElement("div");
      title.className = "preview-title";

      if (myPinData[i].music.title.length > 0) {
        title.textContent = myPinData[i].music.title;
      } else {
        title.textContent = "저장한 음악이 없습니다.";
      }

      const memo = document.createElement("div");
      memo.className = "preview-memo";
      if (myPinData[i].memo.length > 0) {
        memo.textContent = myPinData[i].memo;
      } else {
        memo.textContent = "저장한 메모가 없습니다.";
      }

      hideOverflow.append(title);
      titleContainer.append(hideOverflow);
      musicContainer.append(thumbnail, titleContainer);
      iwContent.append(musicContainer, memo);

      const infowindow = new window.kakao.maps.CustomOverlay({
        position,
        content: iwContent,
        xAnchor: 0.6,
        yAnchor: 1.6,
      });

      window.kakao.maps.event.addListener(marker, "mouseover", () => {
        infowindow.setMap(map);
      });
      window.kakao.maps.event.addListener(marker, "mouseout", () => {
        infowindow.setMap(null);
      });

      marker.setMap(map);
      markers.push(marker);
      // setSaveinfowindows([...saveInfowindows, infowindow]);
    }
    setMyMarkers(markers);
  };

  const viewDummies = () => {
    deleteMyMarkers();
    const markers = [];
    for (let i = 0; i < Dummies.length; i += 1) {
      const position = new window.kakao.maps.LatLng(
        Dummies[i].location.longitude,
        Dummies[i].location.latitude
      );
      const image = new window.kakao.maps.MarkerImage(
        "/images/marker/userpin.png",
        new window.kakao.maps.Size(90, 70)
      );
      const marker = new window.kakao.maps.Marker({
        map,
        position,
        image,
      });
      marker.id = Dummies[i]._id;
      window.kakao.maps.event.addListener(marker, "click", () => {
        // 마커 클릭 시
        infowindow.setMap(null);
        handleMyMarkerClick(marker.id);
      });

      const iwContent = document.createElement("div");
      iwContent.className = "preview";
      const musicContainer = document.createElement("div");
      musicContainer.className = "music-flex-box";
      const thumbnail = document.createElement("img");
      thumbnail.className = "preview-img";
      thumbnail.src = Dummies[i].music.thumbnail;
      const titleContainer = document.createElement("div");
      titleContainer.className = "preview-title-container";
      const hideOverflow = document.createElement("div");
      hideOverflow.className = "hide-overflow";
      const title = document.createElement("div");
      title.className = "preview-title";
      title.textContent = Dummies[i].music.title;
      const memo = document.createElement("div");
      memo.className = "preview-memo";
      memo.textContent = Dummies[i].memo;
      hideOverflow.append(title);
      titleContainer.append(hideOverflow);
      musicContainer.append(thumbnail, titleContainer);
      iwContent.append(musicContainer, memo);
      const infowindow = new window.kakao.maps.CustomOverlay({
        position,
        content: iwContent,
        xAnchor: 0.6,
        yAnchor: 1.6,
      });

      window.kakao.maps.event.addListener(marker, "mouseover", () => {
        infowindow.setMap(map);
      });
      window.kakao.maps.event.addListener(marker, "mouseout", () => {
        infowindow.setMap(null);
      });

      marker.setMap(map);
      markers.push(marker);
    }
    setMyMarkers(markers);
  };

  // 체크 된 팔로우 핀 가져오기 (마커 만들기 위한 데이터)
  const [followPinData, setFollowPinData] = useState<any[]>([]);
  const getFollowMarker = () => {
    axios
      .get(`${process.env.REACT_APP_SERVER_URL}/pins/users/${checkAdded}`)
      .then((res) => res.data)
      .then((data) => {
        setFollowPinData(data);
      })
      .catch((err) => console.log(err));
  };

  // 체크 된 팔로우 마커 생성
  const [followMarkers, setFollowMarkers] = useState<any[]>([]);
  const viewFollowMarkers = () => {
    const markers = [];

    for (let i = 0; i < followPinData.length; i += 1) {
      const position = new window.kakao.maps.LatLng(
        parseFloat(followPinData[i].location.longitude),
        parseFloat(followPinData[i].location.latitude)
      );

      const image = new window.kakao.maps.MarkerImage(
        `/images/FollowMarker/${markerSet[currentMarker][0]}`,
        new window.kakao.maps.Size(90, 70)
      );

      const marker = new window.kakao.maps.Marker({
        image,
        map,
        position,
      });
      marker.id = [followPinData[i]._id, followPinData[i].user_id];

      window.kakao.maps.event.addListener(marker, "click", () => {
        // 마커 클릭 시
        infowindow.setMap(null);
        handleFollowMarkerClick(marker.id[0]);
      });

      //팔로우 마커 호버 적용
      const iwContent = document.createElement("div");
      iwContent.className = "preview";
      const musicContainer = document.createElement("div");
      musicContainer.className = "music-flex-box";
      const thumbnail = document.createElement("img");
      thumbnail.className = "preview-img";
      if (followPinData[i].music.thumbnail.length > 0) {
        thumbnail.src = followPinData[i].music.thumbnail;
      } else {
        thumbnail.src =
          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/CD_icon_test.svg/1200px-CD_icon_test.svg.png";
      }
      const titleContainer = document.createElement("div");
      titleContainer.className = "preview-title-container";
      const hideOverflow = document.createElement("div");
      hideOverflow.className = "hide-overflow";
      const title = document.createElement("div");
      title.className = "preview-title";

      if (followPinData[i].music.title.length > 0) {
        title.textContent = followPinData[i].music.title;
      } else {
        title.textContent = "저장한 음악이 없습니다.";
      }

      const memo = document.createElement("div");
      memo.className = "preview-memo";
      if (followPinData[i].memo.length > 0) {
        memo.textContent = followPinData[i].memo;
      } else {
        memo.textContent = "저장한 메모가 없습니다.";
      }

      hideOverflow.append(title);
      titleContainer.append(hideOverflow);
      musicContainer.append(thumbnail, titleContainer);
      iwContent.append(musicContainer, memo);

      const infowindow = new window.kakao.maps.CustomOverlay({
        position,
        content: iwContent,
        xAnchor: 0.6,
        yAnchor: 1.6,
      });

      window.kakao.maps.event.addListener(marker, "mouseover", () => {
        infowindow.setMap(map);
      });
      window.kakao.maps.event.addListener(marker, "mouseout", () => {
        infowindow.setMap(null);
      });

      marker.setMap(map);
      markers.push(marker);
      // setSaveinfowindows([...saveInfowindows, infowindow]);
    }
    setFollowMarkers([...followMarkers, markers]);
  };

  // 체크된 마커 데이터 가져와서 저장
  const handleFollowMarkerClick = (pinId: string) => {
    if (openPostModal) {
      setOpenPostModal(false);
    }
    setOpenReadModal(false);
    axios
      .get(`${process.env.REACT_APP_SERVER_URL}/pins/pins/${pinId}`)
      .then((res) => res.data)
      .then((data) => setReadMarkerData(data))
      .then(() => {
        dispatch(switchMode("WATCH"));
        setOpenReadModal(true);
      })
      .catch((err) => console.log(err));
  };

  // 체크박스 체크 시 마커 생성
  useEffect(() => {
    if (checkAdded.length === 0) {
      return;
    }
    getFollowMarker();
  }, [currentMarker]);

  useEffect(() => {
    if (followPinData.length === 0) {
      return;
    }
    viewFollowMarkers();
  }, [followPinData]);

  // 체크박스 해제 시 마커 제거
  const deleteFollowMarkers = () => {
    for (let i = 0; i < followMarkers.length; i += 1) {
      for (let j = 0; j < followMarkers[i].length; j += 1) {
        if (followMarkers[i][j].id[1] === checkRemoved) {
          followMarkers[i][j].setMap(null);
        }
      }
    }
    dispatch(clearCheckedRemove());
  };

  useEffect(() => {
    deleteFollowMarkers();
  }, [checkedFollow]);

  // 마커 제거 함수들
  const deleteMyMarkers = () => {
    for (let i = 0; i < myMarkers.length; i++) {
      myMarkers[i].setMap(null);
    }
  };

  const deletePostMarkers = () => {
    for (let i = 0; i < postMarkers.length; i++) {
      postMarkers[i].setMap(null);
    }
  };

  const deleteSearchMarkers = () => {
    for (let i = 0; i < searchMarkers.length; i++) {
      searchMarkers[i].setMap(null);
    }
  };

  // const deleteInfowindows = () => {
  //   for (let i = 0; i < saveInfowindows.length; i++) {
  //     saveInfowindows[i].setMap(null);
  //   }
  // };

  // READ 마커 클릭 핸들러
  const handleMyMarkerClick = (id: string | number) => {
    if (openPostModal) {
      setOpenPostModal(false);
    }
    setOpenReadModal(false);
    if (!isLogin) {
      for (let i = 0; i < Dummies.length; i += 1) {
        if (Dummies[i]._id === id) {
          setReadMarkerData(Dummies[i]);
          break;
        }
      }
    }
    for (let i = 0; i < myPinData.length; i += 1) {
      if (myPinData[i]._id === id) {
        setReadMarkerData(myPinData[i]);
        break;
      }
    }
    dispatch(switchMode("READ"));
    setOpenReadModal(true);
  };

  // 카카오맵 로드
  const loadKakaoMap = () => {
    const container = document.getElementById("kakao-map");
    const options = {
      center: new window.kakao.maps.LatLng(LatLng[0], LatLng[1]),
      level: mapLevel,
    };

    const map = new window.kakao.maps.Map(container, options);
    setMap(map);

    // 지도 클릭 핸들러
    window.kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
      setOpenReadModal(false);
      setReadMarkerData(null);
      const clickPosition = mouseEvent.latLng;
      setPostLatLng([clickPosition.Ma, clickPosition.La]);
      if (!isLogin) {
        setLoginController(true);
      } else {
        dispatch(switchMode("POST"));
        setOpenPostModal(true);
      }
    });
  };

  // 맵 이동
  const moveKakaoMap = (lat: number, lng: number) => {
    const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
    map.panTo(moveLatLon);
    setLatLng([lat, lng]);
  };

  // 키워드 검색 인풋
  const handleChangeKeywordInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setKeywordInput(e.target?.value);
    },
    [keywordInput]
  );

  // 키워드 검색 자동완성
  const searchKeyword = () => {
    if (keywordInput === "") {
      setKeywordSearchData([]);
      setSearchMode(false);
      return;
    }
    setSearchMode(true);
    axios
      .get(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${keywordInput}`,
        {
          headers: {
            authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_MAP_RESTAPI_KEY}`,
          },
        }
      )
      .then((res) => {
        if (res.data.documents.length === 0) {
          return;
        }
        const slicedData = res.data.documents.slice(0, 4);
        setKeywordSearchData(slicedData);
      });
  };

  // 키워드 검색 버튼 + 엔터키 검색
  const keywordSearchEvent = (e: any) => {
    if (keywordInput.length === 0 || keywordSearchData.length === 0) {
      return;
    } else if (e.keyCode === 13 || e.type === "click") {
      const y = keywordSearchData[0].y;
      const x = keywordSearchData[0].x;
      moveKakaoMap(y, x);
      setSearchMode(false);
      setSearchLatlng([y, x]);
    }
  };

  // 자동완성 목록 클릭 시 이동
  const keywordSearchSelect = (y: number, x: number) => {
    moveKakaoMap(y, x);
    setSearchMode(false);
    setSearchLatlng([y, x]);
  };

  const showHideDetailModal = () => {
    if (detailModal.current.style.display === "none") {
      detailModal.current.style.display = "block";
    } else {
      detailModal.current.style.display = "none";
    }
  };

  useEffect(() => {
    setOpenReadModal(false);
    setOpenPostModal(false);
  }, [isLogin]);

  return (
    <div className="App">
      <Nav
        openReadModal={openReadModal}
        openPostModal={openPostModal}
        setOpenPostModal={setOpenPostModal}
        setOpenReadModal={setOpenReadModal}
        loginController={loginController}
        setLoginController={setLoginController}
        deletePostMarkers={deletePostMarkers}
      />
      {openPostModal || openReadModal ? (
        <>
          {/* <div
            className="detail-modal-close"
            onClick={() => {
              setOpenPostModal(false);
              setOpenReadModal(false);
              deletePostMarkers();
            }}
          >
            X
          </div> */}
          {showDetailModal ? (
            <button
              className="detail-modal-hide"
              onClick={() => {
                showHideDetailModal();
                setShowDetailModal(false);
              }}
            >
              {"<"}
              {/*show*/}
            </button>
          ) : (
            <button
              className="detail-modal-hide"
              onClick={() => {
                showHideDetailModal();
                setShowDetailModal(true);
              }}
            >
              {"<"}
              {/*hide*/}
            </button>
          )}{" "}
        </>
      ) : (
        <> </>
      )}
      <SearchLocation
        handleChangeKeywordInput={handleChangeKeywordInput}
        keywordSearchEvent={keywordSearchEvent}
        keywordSearchData={keywordSearchData}
        searchMode={searchMode}
        keywordSearchSelect={keywordSearchSelect}
      />
      <FollowList setLoginController={setLoginController} />
      <div ref={detailModal}>
        {openReadModal ? (
          <ReadModal
            readMarkerData={readMarkerData}
            setPinUpdate={setPinUpdate}
            deleteMyMarker={deleteMyMarker}
            setOpenReadModal={setOpenReadModal}
          />
        ) : openPostModal ? (
          <PostModal
            postLatLng={postLatLng}
            setOpenPostModal={setOpenPostModal}
            deletePostMarkers={deletePostMarkers}
          />
        ) : (
          <></>
        )}
      </div>
      <div id="kakao-map" />
    </div>
  );
}

export default MainPage;
