import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Trash2, Edit2, ChevronLeft, ChevronRight } from 'react-feather';
import ChatWindow from './ChatWindow';
import LZString from 'lz-string';  // For compression

const MAX_CONVERSATIONS = 500;  // Limit the number of stored conversations
const MAX_MESSAGES_PER_CONVERSATION = 5000;  // Limit the number of messages per conversation

const ConversationManagerWrapper = styled.div`
  display: flex;
  height: 100vh;
`;

const SidebarWrapper = styled.div`
  width: ${props => (props.isOpen ? '250px' : '0')};
  min-width: ${props => (props.isOpen ? '250px' : '0')};
  background-color: ${props => props.theme.colors.conversationBackground};
  padding: ${props => (props.isOpen ? '20px' : '0')};
  overflow-y: auto;
  transition: width 0.3s ease, padding 0.3s ease;
`;

const SidebarContent = styled.div`
  display: ${props => (props.isOpen ? 'block' : 'none')};
`;

const ConversationList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const ConversationItem = styled.li`
  padding: 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 4px;
  background-color: ${props => props.isSelected ? props.theme.colors.highlight : 'transparent'};
  
  &:hover {
    background-color: ${props => props.isSelected ? props.theme.colors.highlight : props.theme.colors.hover};
  }
`;

const ConversationTitle = styled.span`
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 10px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Icon = styled.div`
  opacity: 0.5;
  transition: opacity 0.2s;
  margin-left: 5px;
  cursor: pointer;
  
  &:hover {
    opacity: 1;
  }
`;

const TitleInput = styled.input`
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.text};
  font-size: 1em;
  width: 100%;
  &:focus {
    outline: none;
  }
`;

const EditableTitle = ({ title, isEditing, onEdit, onSubmit }) => {
  const inputRef = useRef(null);
  const [editedTitle, setEditedTitle] = useState(title);

  useEffect(() => {
    if (isEditing) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    onSubmit(editedTitle);
  };

  if (isEditing) {
    return (
      <TitleInput
        ref={inputRef}
        value={editedTitle}
        onChange={(e) => setEditedTitle(e.target.value)}
        onBlur={handleSubmit}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSubmit();
          }
        }}
      />
    );
  }

  return (
    <>
      <ConversationTitle>{title}</ConversationTitle>
      <IconWrapper>
        <Icon onClick={onEdit}>
          <Edit2 size={14} />
        </Icon>
      </IconWrapper>
    </>
  );
};

const NewChatButton = styled.button`
  width: 100%;
  padding: 10px;
  margin-bottom: 20px;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  border: none;
  border-radius: 20px;
  cursor: pointer;
`;

const ChatWindowWrapper = styled.div`
  flex-grow: 1;
  overflow-y: auto;
`;

const ToggleSidebarButton = styled.button`
  position: absolute;
  top: 20px;
  left: ${props => (props.isOpen ? '250px' : '0')};
  transform: ${props => (props.isOpen ? 'none' : 'translateX(0)')};
  transition: left 0.3s ease;
  border: none;
  background: lightgrey;
  cursor: pointer;
  color: black;
`;

const ConversationManager = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const loadConversations = () => {
      const savedConversations = localStorage.getItem('conversations');
      if (savedConversations) {
        try {
          const decompressedData = LZString.decompress(savedConversations);
          const parsedConversations = JSON.parse(decompressedData);
          setConversations(parsedConversations.slice(-MAX_CONVERSATIONS));
          if (parsedConversations.length > 0) {
            setCurrentConversationId(parsedConversations[parsedConversations.length - 1].id);
            setIsSidebarOpen(true);
          }
        } catch (error) {
          console.error('Error parsing conversations:', error);
          createNewConversation();
        }
      } else {
        createNewConversation();
      }
    };

    loadConversations();
  }, []);

  useEffect(() => {
    const saveConversations = () => {
      try {
        const compressedData = LZString.compress(JSON.stringify(conversations));
        localStorage.setItem('conversations', compressedData);
      } catch (error) {
        console.error('Error saving conversations:', error);
      }
    };

    if (conversations.length > 0) {
      saveConversations();
    } else {
      localStorage.removeItem('conversations');
    }
  }, [conversations]);

  useEffect(() => {
    if (conversations.length >= 0) {
      localStorage.setItem('sidebarOpen', isSidebarOpen);
    }
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const createNewConversation = () => {
    const newConversation = {
      id: Date.now(),
      messages: [],
      title: `Conversation ${conversations.length + 1}`,
    };
    setConversations(prevConversations => [...prevConversations, newConversation].slice(-MAX_CONVERSATIONS));
    setCurrentConversationId(newConversation.id);
    setIsSidebarOpen(true);
  };

  const selectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const updateConversation = (id, newMessages) => {
    setConversations(prevConversations =>
      prevConversations.map(conv =>
        conv.id === id ? { ...conv, messages: newMessages.slice(-MAX_MESSAGES_PER_CONVERSATION) } : conv
      )
    );
  };

  const deleteConversation = (id) => {
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.filter(conv => conv.id !== id);

      if (currentConversationId === id) {
        if (updatedConversations.length > 0) {
          setCurrentConversationId(updatedConversations[updatedConversations.length - 1].id);
        } else {
          setCurrentConversationId(null);
        }
      }

      if (updatedConversations.length === 0) {
        setIsSidebarOpen(true);
      }

      return updatedConversations.slice(-MAX_CONVERSATIONS);
    });
  };

  const renameConversation = (id, newTitle) => {
    setConversations(prevConversations =>
      prevConversations.map(conv =>
        conv.id === id ? { ...conv, title: newTitle } : conv
      )
    );
    setEditingConversationId(null);
  };

  const currentConversation = conversations.find(conv => conv.id === currentConversationId) || { messages: [] };

  return (
    <ConversationManagerWrapper>
      <ToggleSidebarButton onClick={toggleSidebar} isOpen={isSidebarOpen}>
        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </ToggleSidebarButton>
      <SidebarWrapper isOpen={isSidebarOpen}>
        <SidebarContent isOpen={isSidebarOpen}>
          <NewChatButton onClick={createNewConversation}>New Chat</NewChatButton>
          <ConversationList>
            {conversations.map(conv => (
              <ConversationItem 
                key={conv.id}
                isSelected={conv.id === currentConversationId}
                onClick={() => selectConversation(conv.id)}
              >
                <EditableTitle
                  title={conv.title}
                  isEditing={editingConversationId === conv.id}
                  onEdit={() => setEditingConversationId(conv.id)}
                  onSubmit={(newTitle) => renameConversation(conv.id, newTitle)}
                />
                <Icon 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 size={14} />
                </Icon>
              </ConversationItem>
            ))}
          </ConversationList>
        </SidebarContent>
      </SidebarWrapper>
      <ChatWindowWrapper>
        {currentConversationId ? (
          <ChatWindow
            key={currentConversationId}
            initialMessages={currentConversation.messages}
            onMessagesUpdate={(newMessages) => updateConversation(currentConversationId, newMessages)}
          />
        ) : (
          <div>No conversation selected. Start a new chat!</div>
        )}
      </ChatWindowWrapper>
    </ConversationManagerWrapper>
  );
};

export default ConversationManager;
